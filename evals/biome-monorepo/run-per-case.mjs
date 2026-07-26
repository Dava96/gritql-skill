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
import { join } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	cli,
	defaultBiomeEvalRepo,
	git,
	parseArgs,
	repositoryRoot,
	runCli,
	worktreePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.model) {
	throw new Error(
		"Pass --model <provider/model> so both conditions use the same model.",
	);
}

const repo = args.repo ? String(args.repo) : defaultBiomeEvalRepo();
const paths = worktreePaths(repo);
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
const resultRoot = join(
	repositoryRoot,
	"evals",
	"biome-monorepo",
	"results",
	runId,
);
const isolatedSkill = mkdtempSync(join(tmpdir(), "gritql-eval-skill-"));
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
	const piVersion = runCli("pi", ["--version"]).stdout.trim();
	for (const condition of conditions) {
		const worktree = paths[condition.key];
		if (args.start) {
			assertContinuationWorktree(worktree, manifest.branches[condition.key]);
		} else {
			assertFreshWorktree(worktree, manifest.branches[condition.key]);
		}
		const biome = runCli("pnpm", ["exec", "biome", "--version"], {
			cwd: worktree,
			allowFailure: true,
		});
		if (biome.status !== 0) {
			throw new Error(
				`Biome is unavailable in ${worktree}. Prepare with --install.`,
			);
		}

		const taskSource = readFileSync(
			join(worktree, "gritql-eval", "TASKS.md"),
			"utf8",
		);
		const runs = [];
		for (const testCase of manifest.cases) {
			if (args.start && testCase.id.localeCompare(String(args.start)) < 0)
				continue;
			if (selectedCases && !selectedCases.has(testCase.id)) continue;
			const task = extractTask(taskSource, testCase.id);
			const label = `${condition.label}-case-${testCase.id}`;
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
				`${task}\n\nComplete only case ${testCase.id}. Finish and validate its retained plugin before doing anything else. Preserve previous cases and append this case's evidence to gritql-eval/REPORT.md; record the exact local Biome version once. Remove temporary validation copies. Do not commit.`,
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
				const logPath = join(resultRoot, `${label}${suffix}.log`);
				exitCode = await runAndTee("pi", piArgs, worktree, logPath);
				attempts.push({ attempt, exitCode, log: `${label}${suffix}.log` });
				if (exitCode === 0) break;
				resetPartialResult(worktree);
				if (attempt < maxAttempts) {
					const delay = Math.min(attempt * 15_000, 60_000);
					console.warn(
						`Attempt ${attempt} failed; retrying in ${delay / 1000}s.`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
			const commit = preserveResult(worktree, label);
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
						piVersion,
						biomeVersion: biome.stdout.trim(),
						runs,
					},
					null,
					4,
				)}\n`,
			);
		}
	}
	console.log(
		args.dryRun
			? "\nPer-case dry-run preflight passed."
			: `\nPer-case logs: ${resultRoot}\nRun npm run eval:score to compare branches.`,
	);
} finally {
	rmSync(isolatedSkill, { recursive: true, force: true });
}

function extractTask(source, id) {
	const firstCase = source.search(/^## 01\b/m);
	const start = source.search(new RegExp(`^## ${id}\\b`, "m"));
	if (firstCase < 0 || start < 0)
		throw new Error(`Cannot find case ${id} in TASKS.md.`);
	const remainder = source.slice(start + 1);
	const nextOffset = remainder.search(/^## \d{2}\b/m);
	const end = nextOffset < 0 ? source.length : start + 1 + nextOffset;
	return `${source.slice(0, firstCase).trim()}\n\n${source.slice(start, end).trim()}`;
}

function assertFreshWorktree(worktree, branch) {
	assertContinuationWorktree(worktree, branch);
	const seed = git(worktree, [
		"log",
		"--format=%H",
		"--grep=^test(eval): seed GritQL migration stress suite$",
		"-n",
		"1",
	]).stdout.trim();
	const head = git(worktree, ["rev-parse", "HEAD"]).stdout.trim();
	if (head !== seed) {
		throw new Error(
			`${branch} already contains evaluation results. Clean and prepare again.`,
		);
	}
}

function assertContinuationWorktree(worktree, branch) {
	if (!existsSync(worktree)) throw new Error(`Missing worktree: ${worktree}`);
	const actualBranch = git(worktree, [
		"branch",
		"--show-current",
	]).stdout.trim();
	if (actualBranch !== branch)
		throw new Error(`Expected ${branch}, found ${actualBranch}.`);
	const status = git(worktree, ["status", "--porcelain"]).stdout.trim();
	if (status) throw new Error(`Worktree is dirty:\n${status}`);
	const seed = git(worktree, [
		"log",
		"--format=%H",
		"--grep=^test(eval): seed GritQL migration stress suite$",
		"-n",
		"1",
	]).stdout.trim();
	if (!seed) throw new Error(`${branch} does not contain the evaluation seed.`);
}

function resetPartialResult(worktree) {
	git(worktree, ["reset", "--hard", "HEAD"]);
	git(worktree, ["clean", "-fd"]);
}

function preserveResult(worktree, label) {
	if (git(worktree, ["status", "--porcelain"]).stdout.trim()) {
		git(worktree, ["add", "-A"]);
		git(
			worktree,
			[
				"-c",
				"commit.gpgSign=false",
				"commit",
				"--no-verify",
				"-m",
				`eval(gritql): preserve ${label}`,
			],
			{ env: { ...process.env, HUSKY: "0" }, stdio: "inherit" },
		);
	}
	return git(worktree, ["rev-parse", "HEAD"]).stdout.trim();
}

function runAndTee(name, commandArgs, cwd, logPath) {
	return new Promise((resolve, reject) => {
		const log = createWriteStream(logPath, { flags: "wx" });
		const { command, prefixArgs } = cli(name);
		const child = spawn(command, [...prefixArgs, ...commandArgs], {
			cwd,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		child.stdout.on("data", (chunk) => {
			process.stdout.write(chunk);
			log.write(chunk);
		});
		child.stderr.on("data", (chunk) => {
			process.stderr.write(chunk);
			log.write(chunk);
		});
		child.on("error", (error) => {
			log.end();
			reject(error);
		});
		child.on("close", (code) => {
			log.end();
			resolve(code ?? 1);
		});
	});
}
