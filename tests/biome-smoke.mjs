import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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
const message = "Use console.info instead of console.log.";

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
	assert.equal(
		(output(invalid).match(new RegExp(escapeRegex(message), "g")) ?? []).length,
		3,
		`expected one plugin diagnostic for each argument-cardinality fixture\n${output(invalid)}`,
	);

	for (const path of ["valid.js", "suppressed.js", "excluded.js"]) {
		const result = runBiome([
			"lint",
			path,
			"--colors=off",
			"--max-diagnostics=none",
		]);
		assert.equal(result.status, 0, output(result));
		assert.doesNotMatch(output(result), new RegExp(escapeRegex(message)));
	}

	const actualPath = join(fixture, "actual.js");
	cpSync(join(fixture, "invalid.js"), actualPath);

	const ordinaryWrite = runBiome([
		"lint",
		"--write",
		"actual.js",
		"--colors=off",
	]);
	assert.equal(ordinaryWrite.status, 0, output(ordinaryWrite));
	assert.equal(
		normalizeNewlines(readFileSync(actualPath, "utf8")),
		normalizeNewlines(readFileSync(join(fixture, "invalid.js"), "utf8")),
		"plain --write must not apply an unsafe plugin fix",
	);

	const unsafeWrite = runBiome([
		"lint",
		"--write",
		"--unsafe",
		"actual.js",
		"--colors=off",
	]);
	assert.equal(unsafeWrite.status, 0, output(unsafeWrite));
	assert.equal(
		normalizeNewlines(readFileSync(actualPath, "utf8")),
		normalizeNewlines(readFileSync(join(fixture, "valid.js"), "utf8")),
		"--write --unsafe should produce the valid fixture",
	);

	const idempotent = runBiome([
		"lint",
		"--write",
		"--unsafe",
		"actual.js",
		"--colors=off",
	]);
	assert.equal(idempotent.status, 0, output(idempotent));
	assert.equal(
		normalizeNewlines(readFileSync(actualPath, "utf8")),
		normalizeNewlines(readFileSync(join(fixture, "valid.js"), "utf8")),
		"second plugin pass should be idempotent",
	);

	const search = runBiome([
		"search",
		"`console.log($arguments)`",
		"invalid.js",
		"--colors=off",
	]);
	assert.equal(search.status, 0, output(search));
	assert.match(output(search), /console\.log/);

	const jsxMessage = "Rename filmStock to emulsion.";
	writeFileSync(
		join(fixture, "rename-film-stock.grit"),
		`engine biome(1.0)
language js(typescript, jsx)

JsxAttribute(name = $name) as $attribute where {
    $name <: \`filmStock\`,
    $attribute <: within \`<FilmBadge $... />\`,
    register_diagnostic(
        span = $name,
        message = "${jsxMessage}",
        fix_kind = "unsafe"
    ),
    $name => \`emulsion\`
}
`,
	);
	const configPath = join(fixture, "biome.json");
	const config = JSON.parse(readFileSync(configPath, "utf8"));
	config.plugins.push({
		path: "./rename-film-stock.grit",
		includes: ["**/*.tsx"],
	});
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	const jsxInput = `export const shelf = (
    <section>
        <FilmBadge filmStock="one" />
        <FilmBadge size="small" filmStock={selected} compact />
        <FilmBadge {...defaults} filmStock={metadata.stock} />
        <OtherBadge filmStock="near-miss" />
    </section>
);\n`;
	const jsxExpected = jsxInput
		.replaceAll("<FilmBadge filmStock", "<FilmBadge emulsion")
		.replace('size="small" filmStock', 'size="small" emulsion')
		.replace("{...defaults} filmStock", "{...defaults} emulsion");
	const jsxPath = join(fixture, "actual.tsx");
	writeFileSync(jsxPath, jsxInput);
	const jsxLint = runBiome([
		"lint",
		"actual.tsx",
		"--colors=off",
		"--max-diagnostics=none",
	]);
	assert.equal(
		(output(jsxLint).match(new RegExp(escapeRegex(jsxMessage), "g")) ?? [])
			.length,
		3,
		output(jsxLint),
	);
	const jsxWrite = runBiome([
		"lint",
		"--write",
		"--unsafe",
		"actual.tsx",
		"--colors=off",
	]);
	assert.equal(jsxWrite.status, 0, output(jsxWrite));
	assert.equal(readFileSync(jsxPath, "utf8"), jsxExpected);
} finally {
	rmSync(fixture, { recursive: true, force: true });
}

console.log(
	"Biome 2.5.5 diagnostics, argument cardinality, JSX ancestors, negative fixtures, includes, suppression, unsafe writes, idempotence, and search passed.",
);

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

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
