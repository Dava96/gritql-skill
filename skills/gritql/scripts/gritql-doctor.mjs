#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const maxFiles = 25_000;
const ignoredDirectories = new Set([
	".git",
	".hg",
	".svn",
	".next",
	".turbo",
	".venv",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"target",
	"vendor",
]);

if (!existsSync(root) || !statSync(root).isDirectory()) {
	console.error(`Project root is not a directory: ${root}`);
	process.exitCode = 2;
} else {
	diagnose(root);
}

function diagnose(projectRoot) {
	const found = {
		biomeConfigs: [],
		gritConfigs: [],
		gritFiles: [],
		packageFiles: [],
		lockFiles: [],
	};
	let visitedFiles = 0;
	let truncated = false;

	const visit = (directory) => {
		if (visitedFiles >= maxFiles) {
			truncated = true;
			return;
		}

		let entries;
		try {
			entries = readdirSync(directory, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (visitedFiles >= maxFiles) {
				truncated = true;
				return;
			}
			if (entry.isSymbolicLink()) continue;

			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (!ignoredDirectories.has(entry.name)) visit(path);
				continue;
			}
			if (!entry.isFile()) continue;
			visitedFiles += 1;

			const rel = portableRelative(projectRoot, path);
			if (entry.name === "biome.json" || entry.name === "biome.jsonc") {
				found.biomeConfigs.push(rel);
			} else if (
				(entry.name === "grit.yaml" || entry.name === "grit.yml") &&
				basename(directory) === ".grit"
			) {
				found.gritConfigs.push(rel);
			} else if (entry.name.endsWith(".grit")) {
				found.gritFiles.push(rel);
			} else if (entry.name === "package.json") {
				found.packageFiles.push(rel);
			} else if (
				[
					"bun.lock",
					"bun.lockb",
					"package-lock.json",
					"pnpm-lock.yaml",
					"yarn.lock",
				].includes(entry.name)
			) {
				found.lockFiles.push(rel);
			}
		}
	};

	visit(projectRoot);

	const packages = found.packageFiles
		.map((path) => inspectPackage(projectRoot, path))
		.filter(Boolean);
	const biomePackages = packages.filter((pkg) => pkg.biomeVersion);
	const gritPackages = packages.filter((pkg) => pkg.gritVersion);
	const configuredPlugins = found.biomeConfigs.filter((path) => {
		const text = safeRead(join(projectRoot, path));
		return text && /["']plugins["']\s*:/.test(text);
	});
	const manager = inferPackageManager(found.lockFiles);

	console.log("GritQL doctor (static, read-only)");
	console.log(`Root: ${projectRoot}`);
	if (truncated)
		console.log(
			`Warning: scan stopped after ${maxFiles.toLocaleString()} files.`,
		);

	printList("Biome configs", found.biomeConfigs);
	printList("Biome configs declaring plugins", configuredPlugins);
	printList("Standalone Grit configs", found.gritConfigs);
	printList(".grit files", found.gritFiles, 12);
	printList("Lockfiles", found.lockFiles);

	console.log("\nDeclared tooling:");
	if (biomePackages.length === 0 && gritPackages.length === 0) {
		console.log(
			"  - No @biomejs/biome or @getgrit/cli dependency found in scanned package.json files.",
		);
	}
	for (const pkg of biomePackages) {
		console.log(`  - @biomejs/biome ${pkg.biomeVersion} (${pkg.path})`);
	}
	for (const pkg of gritPackages) {
		console.log(`  - @getgrit/cli ${pkg.gritVersion} (${pkg.path})`);
	}
	console.log(`  - Inferred package manager: ${manager ?? "unknown"}`);

	const localBiome =
		process.platform === "win32"
			? join(projectRoot, "node_modules", ".bin", "biome.cmd")
			: join(projectRoot, "node_modules", ".bin", "biome");
	console.log(
		`  - Root local Biome binary: ${existsSync(localBiome) ? "present" : "not found"}`,
	);

	console.log("\nLikely runtime profile:");
	if (configuredPlugins.length > 0) {
		console.log("  - Biome analyzer plugin workflow detected.");
		console.log(
			"  - Validate register_diagnostic(), target language, plugin includes, and fix safety with this project's Biome.",
		);
	} else if (found.biomeConfigs.length > 0 || biomePackages.length > 0) {
		console.log(
			"  - Biome is present; use `biome search` for discovery or configure a .grit analyzer plugin for diagnostics/fixes.",
		);
	}
	if (found.gritConfigs.length > 0 || gritPackages.length > 0) {
		console.log(
			"  - Standalone Grit workflow detected; use `grit patterns test` and `grit apply --dry-run`.",
		);
	}
	if (
		found.biomeConfigs.length === 0 &&
		found.gritConfigs.length === 0 &&
		biomePackages.length === 0 &&
		gritPackages.length === 0
	) {
		console.log(
			"  - No runtime is evident. Ask which runner the pattern must target before authoring it.",
		);
	}

	console.log("\nSuggested next commands (review before running):");
	if (found.biomeConfigs.length > 0 || biomePackages.length > 0) {
		const prefix = biomeCommand(manager);
		console.log(`  ${prefix} --version`);
		console.log(`  ${prefix} search '<grit-query>' <fixture-or-narrow-path>`);
		if (configuredPlugins.length > 0) {
			console.log(`  ${prefix} lint <invalid-fixture> <valid-fixture>`);
		}
	}
	if (found.gritConfigs.length > 0 || gritPackages.length > 0) {
		console.log("  grit --version");
		console.log("  grit patterns test --filter=<pattern-name>");
		console.log("  grit apply <pattern-name> <narrow-path> --dry-run");
	}
}

function inspectPackage(projectRoot, relativePath) {
	try {
		const packageJson = JSON.parse(
			readFileSync(join(projectRoot, relativePath), "utf8"),
		);
		const dependencies = {
			...(packageJson.dependencies ?? {}),
			...(packageJson.devDependencies ?? {}),
			...(packageJson.optionalDependencies ?? {}),
		};
		return {
			path: relativePath,
			biomeVersion: dependencies["@biomejs/biome"],
			gritVersion: dependencies["@getgrit/cli"],
		};
	} catch {
		return null;
	}
}

function inferPackageManager(lockFiles) {
	if (lockFiles.some((path) => path.endsWith("pnpm-lock.yaml"))) return "pnpm";
	if (lockFiles.some((path) => path.endsWith("yarn.lock"))) return "yarn";
	if (
		lockFiles.some(
			(path) => path.endsWith("bun.lock") || path.endsWith("bun.lockb"),
		)
	)
		return "bun";
	if (lockFiles.some((path) => path.endsWith("package-lock.json")))
		return "npm";
	return null;
}

function biomeCommand(manager) {
	if (manager === "pnpm") return "pnpm exec biome";
	if (manager === "yarn") return "yarn biome";
	if (manager === "bun") return "bunx biome";
	return "npm exec biome --";
}

function printList(label, values, limit = 8) {
	console.log(`\n${label}: ${values.length}`);
	for (const value of values.slice(0, limit)) console.log(`  - ${value}`);
	if (values.length > limit) console.log(`  - … ${values.length - limit} more`);
}

function safeRead(path) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}

function portableRelative(from, to) {
	return relative(from, to).split("\\").join("/");
}
