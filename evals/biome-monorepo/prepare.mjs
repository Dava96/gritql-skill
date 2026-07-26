import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	assertDirectory,
	defaultBiomeEvalRepo,
	evalRoot,
	git,
	parseArgs,
	runCli,
	worktreePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const repo = args.repo ? String(args.repo) : defaultBiomeEvalRepo();
const paths = worktreePaths(repo);
const seedSource = join(evalRoot, "seed", "gritql-eval");
const seedWorktree = join(repo, "..", `.gritql-biome-eval-seed-${process.pid}`);
const branches = manifest.branches;

assertDirectory(repo, "Target monorepo");
assertDirectory(seedSource, "Evaluation seed");

for (const [condition, branch] of Object.entries(branches)) {
	const branchExists =
		git(repo, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
			allowFailure: true,
		}).status === 0;
	if (branchExists) {
		throw new Error(
			`Branch already exists for ${condition}: ${branch}. Run npm run eval:cleanup first.`,
		);
	}
	if (existsSync(paths[condition])) {
		throw new Error(`Worktree path already exists: ${paths[condition]}`);
	}
}

if (args.fetch !== false) {
	console.log("Fetching origin/main without touching the current checkout...");
	git(repo, ["fetch", "origin", "main"], { stdio: "inherit" });
}

const base = String(args.base ?? manifest.base);
const baseSha = git(repo, ["rev-parse", base]).stdout.trim();
console.log(`Evaluation base: ${base} (${baseSha})`);

let seedAttached = false;
try {
	git(repo, ["worktree", "add", "--detach", seedWorktree, baseSha], {
		stdio: "inherit",
	});
	seedAttached = true;
	cpSync(seedSource, join(seedWorktree, "gritql-eval"), { recursive: true });
	writeFileSync(
		join(seedWorktree, "gritql-eval", ".eval-base.json"),
		`${JSON.stringify({ base: baseSha, source: base, createdAt: new Date().toISOString() }, null, 4)}\n`,
	);
	git(seedWorktree, ["add", "gritql-eval"]);
	git(
		seedWorktree,
		[
			"-c",
			"commit.gpgSign=false",
			"commit",
			"--no-verify",
			"-m",
			"test(eval): seed GritQL migration stress suite",
		],
		{ env: { ...process.env, HUSKY: "0" }, stdio: "inherit" },
	);
	const seedSha = git(seedWorktree, ["rev-parse", "HEAD"]).stdout.trim();

	git(repo, ["worktree", "remove", seedWorktree]);
	seedAttached = false;

	git(
		repo,
		["worktree", "add", "-b", branches.withSkill, paths.withSkill, seedSha],
		{
			stdio: "inherit",
		},
	);
	git(
		repo,
		[
			"worktree",
			"add",
			"-b",
			branches.withoutSkill,
			paths.withoutSkill,
			seedSha,
		],
		{
			stdio: "inherit",
		},
	);

	if (args.install) {
		for (const path of Object.values(paths)) {
			console.log(`Installing the pinned workspace dependencies in ${path}...`);
			runCli("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], {
				cwd: path,
				stdio: "inherit",
			});
		}
	}

	console.log("\nPrepared identical local evaluation branches:");
	console.log(
		`  with skill:    ${branches.withSkill}\n                 ${paths.withSkill}`,
	);
	console.log(
		`  without skill: ${branches.withoutSkill}\n                 ${paths.withoutSkill}`,
	);
	if (!args.install) {
		console.log(
			"\nDependencies were not installed. Re-run with --install before running agents.",
		);
	}
} finally {
	if (seedAttached) {
		git(repo, ["worktree", "remove", "--force", seedWorktree], {
			allowFailure: true,
		});
	}
	rmSync(seedWorktree, { recursive: true, force: true });
}
