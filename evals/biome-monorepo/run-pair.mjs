import { spawn } from "node:child_process";
import {
	cpSync,
	createWriteStream,
	existsSync,
	mkdirSync,
	mkdtempSync,
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
		"Pass the same explicit model to both agents with --model <provider/model>.",
	);
}

const repo = args.repo ? String(args.repo) : defaultBiomeEvalRepo();
const paths = worktreePaths(repo);
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

const conditions = [
	{ key: "withoutSkill", label: "without-skill", skill: false },
	{ key: "withSkill", label: "with-skill", skill: true },
];
if (args.order === "with-first") conditions.reverse();

try {
	const piVersion = runCli("pi", ["--version"]).stdout.trim();
	for (const condition of conditions) {
		const worktree = paths[condition.key];
		if (!existsSync(worktree)) {
			throw new Error(
				`Missing ${condition.label} worktree. Run npm run eval:prepare first.`,
			);
		}
		const branch = git(worktree, ["branch", "--show-current"]).stdout.trim();
		if (branch !== manifest.branches[condition.key]) {
			throw new Error(
				`Expected ${manifest.branches[condition.key]} at ${worktree}, found ${branch}.`,
			);
		}
		const status = git(worktree, ["status", "--porcelain"]).stdout.trim();
		if (status) {
			throw new Error(`${condition.label} worktree is not fresh:\n${status}`);
		}

		const biome = runCli("pnpm", ["exec", "biome", "--version"], {
			cwd: worktree,
			allowFailure: true,
		});
		if (biome.status !== 0) {
			throw new Error(
				`Biome is unavailable in ${worktree}. Run npm run eval:cleanup, then npm run eval:prepare -- --install.`,
			);
		}

		const logPath = join(resultRoot, `${condition.label}.log`);
		const metadataPath = join(resultRoot, `${condition.label}.json`);
		const startedAt = new Date().toISOString();
		console.log(`\n=== Running ${condition.label} on ${branch} ===\n`);

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
			"@gritql-eval/TASKS.md",
			"Complete all ten migrations exactly as specified. Work autonomously, execute the rewrites, validate the result, and leave the requested report. Do not commit.",
		);

		if (args.dryRun) {
			console.log(
				`Dry run: pi ${piArgs.map((argument) => JSON.stringify(argument)).join(" ")}`,
			);
			continue;
		}

		const exitCode = await runAndTee("pi", piArgs, worktree, logPath);
		const changed = git(worktree, ["status", "--porcelain"]).stdout.trim();
		if (changed) {
			git(worktree, ["add", "-A"]);
			git(
				worktree,
				[
					"-c",
					"commit.gpgSign=false",
					"commit",
					"--no-verify",
					"-m",
					`eval(gritql): preserve ${condition.label} agent result`,
				],
				{ env: { ...process.env, HUSKY: "0" }, stdio: "inherit" },
			);
		}
		const finalCommit = git(worktree, ["rev-parse", "HEAD"]).stdout.trim();
		writeFileSync(
			metadataPath,
			`${JSON.stringify(
				{
					condition: condition.label,
					skill: condition.skill,
					model: String(args.model),
					thinking: String(args.thinking ?? "high"),
					piVersion,
					biomeVersion: biome.stdout.trim(),
					branch,
					startedAt,
					finishedAt: new Date().toISOString(),
					exitCode,
					finalCommit,
				},
				null,
				4,
			)}\n`,
		);
		console.log(
			`${condition.label} finished with exit code ${exitCode}; result ${finalCommit}`,
		);
	}
	if (args.dryRun) {
		console.log("\nDry-run preflight passed; no agent was started.");
	} else {
		console.log(`\nLogs and metadata: ${resultRoot}`);
		console.log("Run npm run eval:score to compare the branches.");
	}
} finally {
	rmSync(isolatedSkill, { recursive: true, force: true });
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
