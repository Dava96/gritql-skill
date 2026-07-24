# Unofficial GritQL Skill

> **Unofficial community project.** This repository is not affiliated with, maintained by, sponsored by, or endorsed by Biome, GritQL, Grit.io, Honeycomb, or their maintainers.

An [Agent Skills](https://agentskills.io/) package for:

- writing and debugging GritQL structural queries and rewrites;
- authoring standalone Grit/Marzano patterns and fixture tests;
- building Biome GritQL linter plugins with custom diagnostics;
- validating Biome plugin scope, suppressions, and safe/unsafe fixes.

The skill emphasizes runtime differences and executable fixtures so agents do not mix standalone Tree-sitter patterns with Biome CST nodes or claim an untested query works.

## Install

### Pi

After publication:

```bash
pi install git:github.com/<owner>/gritql-skill
```

Or copy `skills/gritql` to `~/.pi/agent/skills/gritql`.

Other Agent Skills-compatible tools can copy or link the same directory into their skills location.

## Use

Pi can load the skill automatically or explicitly:

```text
/skill:gritql
```

Example requests:

```text
Write and test a GritQL rewrite for this API migration.
```

```text
Build a Biome plugin that reports this project-specific TypeScript pattern.
```

```text
Debug why this standalone Grit pattern works in Marzano but not as a Biome plugin.
```

## Development

Node.js 18+ is required for repository tests:

```bash
npm install
npm test
```

The smoke test runs the bundled plugin against the pinned development version of Biome. Target projects must still validate with their own installed version.

## Layout

```text
skills/gritql/
├── SKILL.md
├── examples/
└── references/
tests/
```

## Primary documentation

- [GritQL language overview](https://docs.grit.io/language/overview)
- [Biome linter plugins](https://biomejs.dev/linter/plugins/)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)

## License

MIT. Upstream project names and trademarks belong to their respective owners.