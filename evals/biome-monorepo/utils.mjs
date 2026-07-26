import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const evalRoot = import.meta.dirname;
export const repositoryRoot = resolve(evalRoot, "..", "..");

export function parseArgs(argv) {
	const result = {};
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (!argument.startsWith("--")) {
			throw new Error(`Unexpected argument: ${argument}`);
		}
		const [rawKey, inlineValue] = argument.slice(2).split("=", 2);
		const key = rawKey.replaceAll(/-([a-z])/g, (_, letter) =>
			letter.toUpperCase(),
		);
		if (rawKey.startsWith("no-")) {
			result[key.slice(2, 3).toLowerCase() + key.slice(3)] = false;
			continue;
		}
		if (inlineValue !== undefined) {
			result[key] = inlineValue;
			continue;
		}
		const next = argv[index + 1];
		if (next && !next.startsWith("--")) {
			result[key] = next;
			index += 1;
		} else {
			result[key] = true;
		}
	}
	return result;
}

export function defaultBiomeEvalRepo() {
	const configured = process.env.BIOME_EVAL_REPO;
	if (!configured) {
		throw new Error("Pass --repo <target-monorepo> or set BIOME_EVAL_REPO.");
	}
	return resolve(configured);
}

export function worktreePaths(repo) {
	const parent = dirname(repo);
	return {
		withSkill: resolve(parent, "gritql-biome-eval-with-skill"),
		withoutSkill: resolve(parent, "gritql-biome-eval-without-skill"),
	};
}

export function cli(name) {
	if (process.platform !== "win32") return { command: name, prefixArgs: [] };

	const npmModules = join(
		process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
		"npm",
		"node_modules",
	);
	const launchers = {
		npm: join(
			dirname(process.execPath),
			"node_modules",
			"npm",
			"bin",
			"npm-cli.js",
		),
		pi: join(
			npmModules,
			"@earendil-works",
			"pi-coding-agent",
			"dist",
			"cli.js",
		),
		pnpm: join(npmModules, "pnpm", "bin", "pnpm.cjs"),
	};
	const launcher = launchers[name];
	if (!launcher || !existsSync(launcher)) {
		throw new Error(`Cannot resolve the Windows launcher for ${name}.`);
	}
	return { command: process.execPath, prefixArgs: [launcher] };
}

export function runCli(name, args, options = {}) {
	const { command, prefixArgs } = cli(name);
	return run(command, [...prefixArgs, ...args], options);
}

export function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		env: options.env ?? process.env,
		stdio: options.stdio ?? "pipe",
	});
	if (result.error) throw result.error;
	if (result.status !== 0 && !options.allowFailure) {
		throw new Error(
			`${command} ${args.join(" ")} failed with exit code ${result.status}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
		);
	}
	return result;
}

export function assertDirectory(path, description) {
	if (!existsSync(path))
		throw new Error(`${description} does not exist: ${path}`);
}

export function git(repo, args, options = {}) {
	return run("git", ["-C", repo, ...args], options);
}
