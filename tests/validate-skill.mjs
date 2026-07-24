import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const skillRoot = join(repositoryRoot, "skills", "gritql");
const skillPath = join(skillRoot, "SKILL.md");
const readmePath = join(repositoryRoot, "README.md");

assert.ok(existsSync(skillPath), "skills/gritql/SKILL.md must exist");

const skill = readFileSync(skillPath, "utf8");
const frontmatterMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
assert.ok(frontmatterMatch, "SKILL.md must begin with YAML frontmatter");

const frontmatter = parseSimpleFrontmatter(frontmatterMatch[1]);
assert.match(
	frontmatter.name ?? "",
	/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
	"skill name is invalid",
);
assert.ok(
	(frontmatter.name ?? "").length <= 64,
	"skill name exceeds 64 characters",
);
assert.ok(frontmatter.description, "skill description is required");
assert.ok(
	frontmatter.description.length <= 1024,
	"skill description exceeds 1024 characters",
);
assert.equal(
	frontmatter.license,
	"MIT",
	"skill license should match repository license",
);

const readme = readFileSync(readmePath, "utf8");
assert.match(
	readme,
	/Unofficial GritQL Skill/,
	"README must identify the skill as unofficial",
);
assert.match(
	readme,
	/not affiliated with, maintained by, sponsored by, or endorsed by/i,
	"README must contain the non-affiliation disclaimer",
);

const markdownFiles = walk(skillRoot).filter((path) => path.endsWith(".md"));
for (const markdownPath of markdownFiles) {
	validateRelativeLinks(markdownPath);
}

for (const requiredPath of [
	"references/biome.md",
	"references/language-core.md",
	"references/refactors.md",
	"references/sources.md",
	"references/troubleshooting.md",
	"scripts/gritql-doctor.mjs",
	"examples/biome-plugin/use-console-info.grit",
]) {
	assert.ok(
		existsSync(join(skillRoot, requiredPath)),
		`missing skill resource: ${requiredPath}`,
	);
}

smokeTestDoctor();
console.log(
	`Validated skill metadata, ${markdownFiles.length} Markdown files, links, and doctor output.`,
);

function parseSimpleFrontmatter(source) {
	const values = {};
	for (const line of source.split(/\r?\n/)) {
		if (/^\s/.test(line)) continue;
		const match = line.match(/^([a-zA-Z0-9-]+):\s*(.*)$/);
		if (!match) continue;
		let value = match[2].trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		values[match[1]] = value;
	}
	return values;
}

function validateRelativeLinks(markdownPath) {
	const markdown = readFileSync(markdownPath, "utf8");
	const links = markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
	for (const [, rawTarget] of links) {
		const target = rawTarget.trim().replace(/^<|>$/g, "");
		if (
			!target ||
			target.startsWith("#") ||
			/^[a-z][a-z0-9+.-]*:/i.test(target)
		)
			continue;
		const pathPart = target.split("#", 1)[0];
		if (!pathPart) continue;
		const resolved = resolve(
			dirname(markdownPath),
			decodeURIComponent(pathPart),
		);
		assert.ok(
			existsSync(resolved),
			`${relative(repositoryRoot, markdownPath)} links to missing path: ${target}`,
		);
	}
}

function smokeTestDoctor() {
	const fixture = mkdtempSync(join(tmpdir(), "gritql-doctor-"));
	try {
		mkdirSync(join(fixture, "plugins"));
		writeFileSync(
			join(fixture, "package.json"),
			JSON.stringify({ devDependencies: { "@biomejs/biome": "2.5.5" } }),
		);
		writeFileSync(join(fixture, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
		writeFileSync(
			join(fixture, "biome.jsonc"),
			'{ "plugins": ["./plugins/rule.grit"] }\n',
		);
		writeFileSync(join(fixture, "plugins", "rule.grit"), "`debugger`\n");

		const result = spawnSync(
			process.execPath,
			[join(skillRoot, "scripts", "gritql-doctor.mjs"), fixture],
			{ encoding: "utf8" },
		);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /Biome analyzer plugin workflow detected/);
		assert.match(result.stdout, /@biomejs\/biome 2\.5\.5/);
		assert.match(result.stdout, /Inferred package manager: pnpm/);
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
}

function walk(root) {
	const files = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...walk(path));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}
