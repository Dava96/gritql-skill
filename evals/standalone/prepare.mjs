import { cpSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import manifest from "./manifest.json" with { type: "json" };
import {
	git,
	parseArgs,
	runCli,
	runGrit,
	standaloneRoot,
	workspacePaths,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const paths = workspacePaths(
	args.root ? resolve(String(args.root)) : undefined,
);
const seed = join(standaloneRoot, "seed", "gritql-standalone-eval");

for (const [key, workspace] of Object.entries(paths)) {
	if (existsSync(workspace)) {
		throw new Error(
			`Workspace already exists: ${workspace}. Run standalone:cleanup first.`,
		);
	}
	cpSync(seed, workspace, { recursive: true });
	git(workspace, ["init"]);
	git(workspace, ["config", "user.name", "GritQL Evaluation"]);
	git(workspace, ["config", "user.email", "gritql-eval@example.invalid"]);
	git(workspace, ["checkout", "-b", manifest.branches[key]]);
	git(workspace, ["add", "-A"]);
	git(workspace, [
		"-c",
		"commit.gpgSign=false",
		"commit",
		"--no-verify",
		"-m",
		"test(eval): seed standalone GritQL stress suite",
	]);
	console.log(`Installing pinned standalone Grit in ${workspace}...`);
	runCli("npm", ["ci", "--no-audit", "--no-fund"], {
		cwd: workspace,
		stdio: "inherit",
	});
	const version = runGrit(workspace, ["--version"]);
	if (version.status !== 0)
		throw new Error(`Pinned Grit failed in ${workspace}.`);
	console.log(`${key}: ${workspace} (${version.stdout.trim()})`);
}
