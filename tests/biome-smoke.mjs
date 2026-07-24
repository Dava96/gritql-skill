import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureSource = join(
	repositoryRoot,
	"skills",
	"gritql",
	"examples",
	"biome-plugin",
);
const biomeLauncher = join(
	repositoryRoot,
	"node_modules",
	"@biomejs",
	"biome",
	"bin",
	"biome",
);

assert.ok(
	existsSync(biomeLauncher),
	"Biome is not installed. Run `npm install` before `npm run test:biome`.",
);

const fixture = mkdtempSync(join(tmpdir(), "gritql-biome-smoke-"));
try {
	cpSync(fixtureSource, fixture, { recursive: true });

	const version = runBiome(["--version"]);
	assert.equal(version.status, 0, output(version));
	assert.match(output(version), /2\.5\.5/);

	const invalid = runBiome([
		"lint",
		"invalid.js",
		"--colors=off",
		"--max-diagnostics=none",
	]);
	assert.notEqual(invalid.status, 0, "violating fixture should fail lint");
	assert.match(output(invalid), /Use console\.info instead of console\.log\./);

	const valid = runBiome([
		"lint",
		"valid.js",
		"--colors=off",
		"--max-diagnostics=none",
	]);
	assert.equal(valid.status, 0, output(valid));
	assert.doesNotMatch(
		output(valid),
		/Use console\.info instead of console\.log\./,
	);

	cpSync(join(fixture, "invalid.js"), join(fixture, "actual.js"));
	const rewrite = runBiome(["lint", "--write", "actual.js", "--colors=off"]);
	assert.equal(rewrite.status, 0, output(rewrite));
	assert.equal(
		normalizeNewlines(readFileSync(join(fixture, "actual.js"), "utf8")),
		normalizeNewlines(readFileSync(join(fixture, "valid.js"), "utf8")),
		"safe plugin rewrite should produce the valid fixture",
	);

	const idempotent = runBiome(["lint", "--write", "actual.js", "--colors=off"]);
	assert.equal(idempotent.status, 0, output(idempotent));
	assert.equal(
		normalizeNewlines(readFileSync(join(fixture, "actual.js"), "utf8")),
		normalizeNewlines(readFileSync(join(fixture, "valid.js"), "utf8")),
		"second plugin pass should be idempotent",
	);

	const search = runBiome([
		"search",
		"`console.log($message)`",
		"invalid.js",
		"--colors=off",
	]);
	assert.equal(search.status, 0, output(search));
	assert.match(output(search), /console\.log/);

	console.log(
		"Biome 2.5.5 plugin diagnostic, negative case, safe rewrite, idempotence, and search passed.",
	);
} finally {
	rmSync(fixture, { recursive: true, force: true });
}

function runBiome(args) {
	return spawnSync(process.execPath, [biomeLauncher, ...args], {
		cwd: fixture,
		encoding: "utf8",
	});
}

function output(result) {
	return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function normalizeNewlines(value) {
	return value.replaceAll("\r\n", "\n");
}
