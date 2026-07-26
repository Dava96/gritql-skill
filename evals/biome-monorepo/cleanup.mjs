import { existsSync, rmSync } from "node:fs";
import manifest from "./manifest.json" with { type: "json" };
import {
	defaultBiomeEvalRepo,
	git,
	parseArgs,
	worktreePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const repo = args.repo ? String(args.repo) : defaultBiomeEvalRepo();
const paths = worktreePaths(repo);

for (const [condition, path] of Object.entries(paths)) {
	if (!existsSync(path)) continue;

	const status = git(path, ["status", "--porcelain"], { allowFailure: true });
	if (status.status === 0 && status.stdout.trim() && !args.force) {
		throw new Error(
			`${condition} worktree has uncommitted changes. Re-run with --force to remove it.`,
		);
	}

	git(repo, ["worktree", "remove", "--force", path], { allowFailure: true });
	const registered = git(repo, ["worktree", "list", "--porcelain"])
		.stdout.split(/\r?\n/)
		.filter((line) => line.startsWith("worktree "))
		.map((line) => normalize(line.slice("worktree ".length)))
		.includes(normalize(path));
	if (registered) {
		throw new Error(`Git still considers ${path} an active worktree.`);
	}

	// On Windows, Git can unregister a worktree but leave ignored pnpm links behind.
	rmSync(path, {
		recursive: true,
		force: true,
		maxRetries: 5,
		retryDelay: 200,
	});
}

for (const branch of Object.values(manifest.branches)) {
	const exists =
		git(repo, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
			allowFailure: true,
		}).status === 0;
	if (exists) git(repo, ["branch", "-D", branch]);
}

console.log("Removed the local GritQL evaluation worktrees and branches.");

function normalize(path) {
	return path.replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
}
