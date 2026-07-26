import { spawn } from "node:child_process";
import {
	cpSync,
	createWriteStream,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	cli,
	git,
	parseArgs,
	repositoryRoot,
	runGrit,
	standaloneRoot,
	workspacePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.model) throw new Error("Pass --model <provider/model>.");
const paths = workspacePaths(
	args.root ? resolve(String(args.root)) : undefined,
);
const selectedCases = args.cases
	? new Set(
			String(args.cases)
				.split(",")
				.map((id) => id.padStart(2, "0")),
		)
	: null;
const maxAttempts = Number(args.attempts ?? 3);
if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
	throw new Error("--attempts must be a positive integer.");
}

const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const resultRoot = join(standaloneRoot, "results", runId);
const isolatedSkill = mkdtempSync(join(tmpdir(), "gritql-standalone-skill-"));
cpSync(
	join(repositoryRoot, "skills", "gritql"),
	join(isolatedSkill, "gritql"),
	{
		recursive: true,
	},
);
mkdirSync(resultRoot, { recursive: true });

let conditions = [
	{ key: "withoutSkill", label: "without-skill", skill: false },
	{ key: "withSkill", label: "with-skill", skill: true },
];
if (args.order === "with-first") conditions.reverse();
if (args.condition) {
	conditions = conditions.filter(({ label }) => label === args.condition);
	if (conditions.length === 0) {
		throw new Error("--condition must be with-skill or without-skill.");
	}
}

try {
	for (const condition of conditions) {
		const workspace = paths[condition.key];
		if (args.start) {
			assertContinuation(workspace, manifest.branches[condition.key]);
		} else {
			assertFresh(workspace, manifest.branches[condition.key]);
		}
		const version = runGrit(workspace, ["--version"], { allowFailure: true });
		if (version.status !== 0)
			throw new Error(`Pinned Grit is unavailable in ${workspace}.`);
		const taskSource = readFileSync(join(workspace, "TASKS.md"), "utf8");
		const runs = [];

		for (const testCase of manifest.cases) {
			if (args.start && testCase.id.localeCompare(String(args.start)) < 0)
				continue;
			if (selectedCases && !selectedCases.has(testCase.id)) continue;
			const label = `${condition.label}-case-${testCase.id}`;
			const task = extractTask(taskSource, testCase.id);
			console.log(`\n=== ${label}: ${testCase.title} ===\n`);
			const piArgs = [
				"--no-session",
				"--no-skills",
				"--no-extensions",
				"--no-prompt-templates",
				"--approve",
				"--model",
				String(args.model),
				"--thinking",
				String(args.thinking ?? "high"),
			];
			if (condition.skill) {
				piArgs.push("--skill", join(isolatedSkill, "gritql", "SKILL.md"));
			}
			piArgs.push(
				"-p",
				`${task}\n\nComplete only case ${testCase.id}. Validate its executable Markdown pattern with the pinned standalone runner, apply it to the specified case, replay it from original input, and prove a no-change second pass. Preserve previous cases and append evidence to REPORT.md. Remove temporary files. Do not commit.`,
			);
			if (args.dryRun) {
				console.log(
					`Dry run: pi ${piArgs.map((value) => JSON.stringify(value)).join(" ")}`,
				);
				continue;
			}

			const startedAt = new Date().toISOString();
			const attempts = [];
			let exitCode = 1;
			for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
				const suffix = attempt === 1 ? "" : `-attempt-${attempt}`;
				const log = `${label}${suffix}.log`;
				exitCode = await runAndTee(
					"pi",
					piArgs,
					workspace,
					join(resultRoot, log),
				);
				attempts.push({ attempt, exitCode, log });
				if (exitCode === 0) break;
				resetPartial(workspace);
				if (attempt < maxAttempts) {
					const delay = Math.min(attempt * 15_000, 60_000);
					console.warn(
						`Attempt ${attempt} failed; retrying in ${delay / 1000}s.`,
					);
					await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
				}
			}
			const commit = preserve(workspace, label);
			const result = {
				case: testCase.id,
				title: testCase.title,
				startedAt,
				finishedAt: new Date().toISOString(),
				exitCode,
				attempts,
				commit,
			};
			runs.push(result);
			writeFileSync(
				join(resultRoot, `${label}.json`),
				`${JSON.stringify(result, null, 4)}\n`,
			);
		}
		if (!args.dryRun) {
			writeFileSync(
				join(resultRoot, `${condition.label}.json`),
				`${JSON.stringify(
					{
						condition: condition.label,
						skill: condition.skill,
						model: String(args.model),
						thinking: String(args.thinking ?? "high"),
						gritVersion: version.stdout.trim(),
						runs,
					},
					null,
					4,
				)}\n`,
			);
		}
	}
	console.log(
		args.dryRun ? "\nStandalone dry-run passed." : `\nLogs: ${resultRoot}`,
	);
} finally {
	rmSync(isolatedSkill, { recursive: true, force: true });
}

function extractTask(source, id) {
	const first = source.search(/^## 01\b/m);
	const start = source.search(new RegExp(`^## ${id}\\b`, "m"));
	if (first < 0 || start < 0) throw new Error(`Cannot find case ${id}.`);
	const nextOffset = source.slice(start + 1).search(/^## \d{2}\b/m);
	const end = nextOffset < 0 ? source.length : start + 1 + nextOffset;
	return `${source.slice(0, first).trim()}\n\n${source.slice(start, end).trim()}`;
}

function assertFresh(workspace, branch) {
	assertContinuation(workspace, branch);
	const seed = git(workspace, [
		"log",
		"--format=%H",
		"--grep=^test(eval): seed standalone GritQL stress suite$",
		"-n",
		"1",
	]).stdout.trim();
	const head = git(workspace, ["rev-parse", "HEAD"]).stdout.trim();
	if (head !== seed) throw new Error(`${branch} already contains results.`);
}

function assertContinuation(workspace, branch) {
	if (!existsSync(workspace))
		throw new Error(`Missing workspace: ${workspace}`);
	const actual = git(workspace, ["branch", "--show-current"]).stdout.trim();
	if (actual !== branch)
		throw new Error(`Expected ${branch}, found ${actual}.`);
	const status = git(workspace, ["status", "--porcelain"]).stdout.trim();
	if (status) throw new Error(`Workspace is dirty:\n${status}`);
}

function resetPartial(workspace) {
	git(workspace, ["reset", "--hard", "HEAD"]);
	git(workspace, ["clean", "-fd"]);
}

function preserve(workspace, label) {
	if (git(workspace, ["status", "--porcelain"]).stdout.trim()) {
		git(workspace, ["add", "-A"]);
		git(
			workspace,
			[
				"-c",
				"commit.gpgSign=false",
				"commit",
				"--no-verify",
				"-m",
				`eval(gritql): preserve ${label}`,
			],
			{ stdio: "inherit" },
		);
	}
	return git(workspace, ["rev-parse", "HEAD"]).stdout.trim();
}

function runAndTee(name, args, cwd, logPath) {
	return new Promise((resolveRun, reject) => {
		const log = createWriteStream(logPath, { flags: "wx" });
		const { command, prefixArgs } = cli(name);
		const child = spawn(command, [...prefixArgs, ...args], {
			cwd,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		for (const [stream, destination] of [
			[child.stdout, process.stdout],
			[child.stderr, process.stderr],
		]) {
			stream.on("data", (chunk) => {
				destination.write(chunk);
				log.write(chunk);
			});
		}
		child.on("error", (error) => {
			log.end();
			reject(error);
		});
		child.on("close", (code) => {
			log.end();
			resolveRun(code ?? 1);
		});
	});
}
