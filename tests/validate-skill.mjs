import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
assert.match(frontmatter.description, /GritQL queries/i);
assert.match(frontmatter.description, /Biome linter plugins/i);
assert.match(frontmatter.description, /register_diagnostic/);
assert.equal(frontmatter.license, "MIT");
assert.match(skill, /Finish one rule end-to-end before starting another/);
assert.match(skill, /Checked 0 files/);
assert.match(skill, /Never run repository-wide `biome check --write`/);
assert.match(skill, /filename stem is the pattern name/);
assert.match(skill, /Never match a whole fixture/);

const biomeReference = readFileSync(
	join(skillRoot, "references", "biome.md"),
	"utf8",
);
assert.match(biomeReference, /--only=plugin/);
assert.match(biomeReference, /\*\*\/fixtures\/invalid\.ts/);
assert.match(biomeReference, /within `<FilmBadge \$\.\.\. \/>`/);
assert.match(biomeReference, /prove the retained plugin reproduces the output/);
const languageReference = readFileSync(
	join(skillRoot, "references", "language-core.md"),
	"utf8",
);
assert.match(languageReference, /filename stem is the pattern name/);
assert.match(languageReference, /Grit 0\.1\.1 runner/);

const readme = readFileSync(readmePath, "utf8");
assert.match(readme, /Unofficial GritQL Skill/);
assert.match(
	readme,
	/not affiliated with, maintained by, sponsored by, or endorsed by/i,
);

const files = walk(skillRoot);
const markdownFiles = files.filter((path) => path.endsWith(".md"));
for (const markdownPath of markdownFiles) validateRelativeLinks(markdownPath);

for (const requiredPath of [
	"references/biome.md",
	"references/language-core.md",
	"references/troubleshooting.md",
	"examples/biome-plugin/use-console-info.grit",
	"examples/biome-plugin/excluded.js",
	"examples/standalone-refactor/.grit/patterns/rename_client_method.md",
]) {
	assert.ok(
		existsSync(join(skillRoot, requiredPath)),
		`missing skill resource: ${requiredPath}`,
	);
}

const skillBytes = statSync(skillPath).size;
const payloadBytes = files.reduce(
	(total, path) => total + statSync(path).size,
	0,
);
assert.ok(skillBytes <= 6_000, `SKILL.md is too large: ${skillBytes} bytes`);
assert.ok(
	payloadBytes <= 30_000,
	`skill payload exceeded the 30 KB maintenance budget: ${payloadBytes} bytes`,
);

console.log(
	`Validated metadata, ${markdownFiles.length} Markdown files, relative links, and ${payloadBytes} byte skill payload.`,
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
	for (const [, rawTarget] of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
		const target = rawTarget.trim().replace(/^<|>$/g, "");
		if (
			!target ||
			target.startsWith("#") ||
			/^[a-z][a-z0-9+.-]*:/i.test(target)
		) {
			continue;
		}
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

function walk(root) {
	const files = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...walk(path));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}
