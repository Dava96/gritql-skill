import { resolve } from "node:path";
import {
	repositoryRoot,
	runCli,
	git as runGit,
} from "../biome-monorepo/utils.mjs";

export {
	cli,
	parseArgs,
	repositoryRoot,
	runCli,
} from "../biome-monorepo/utils.mjs";

export const standaloneRoot = resolve(repositoryRoot, "evals", "standalone");

export function workspacePaths(root = resolve(repositoryRoot, "..")) {
	return {
		withSkill: resolve(root, "gritql-standalone-with-skill"),
		withoutSkill: resolve(root, "gritql-standalone-without-skill"),
	};
}

export function git(cwd, args, options = {}) {
	return runGit(cwd, args, options);
}

export function runGrit(cwd, args, options = {}) {
	return runCli("npm", ["exec", "--", "grit", ...args], {
		cwd,
		...options,
	});
}

export function normalize(value) {
	return value.replaceAll("\r\n", "\n").trimEnd();
}
