# Unofficial GritQL Skill

> **Unofficial community project.** This repository is not affiliated with, maintained by, sponsored by, or endorsed by the Biome project, GritQL, Grit.io, Honeycomb, or their maintainers.

An Agent Skills package for authoring, debugging, testing, and reviewing GritQL used for:

- Biome analyzer/linter plugins;
- structural search with `biome search`;
- standalone Grit patterns;
- deterministic codemods, migrations, and large refactors.

The skill's main purpose is to stop coding agents from guessing GritQL syntax or mixing incompatible runtime features. It distinguishes Biome's GritQL implementation from standalone Grit/Marzano and requires patterns to be validated with the target project's actual CLI.

## Status

Early, usable draft (`0.1.0`). The references were reviewed against upstream sources on 2026-07-24, but GritQL and Biome continue to evolve. The installed target runtime remains authoritative.

## Repository layout

```text
skills/gritql/
├── SKILL.md
├── examples/
├── references/
└── scripts/
tests/
```

## Install

### Pi

After this repository is published:

```bash
pi install git:github.com/<owner>/gritql-skill
```

Or copy `skills/gritql` into `~/.pi/agent/skills/gritql`.

### Other Agent Skills-compatible tools

Copy or link `skills/gritql` into the tool's skills directory. Installation conventions differ by harness; `skills/gritql/SKILL.md` follows the Agent Skills format.

## Use

Let the agent load the skill automatically when it encounters `.grit` files, Biome plugins, GritQL, structural search, or a suitable repeated refactor. In Pi, it can also be loaded explicitly:

```text
/skill:gritql
```

Example requests:

```text
Write and runtime-test a Biome GritQL plugin that bans direct process.env access.
```

```text
Assess whether this API migration should be a GritQL codemod, then build fixtures and a dry-run pattern.
```

```text
Debug why this .grit pattern parses in standalone Grit but fails as a Biome plugin.
```

## Development

Requires Node.js 18+.

```bash
npm install
npm test
```

`npm test` validates the skill package and runs smoke tests against the pinned development version of Biome.

The read-only environment detector can also be run directly:

```bash
node skills/gritql/scripts/gritql-doctor.mjs /path/to/project
```

## Design principles

1. Identify the GritQL runtime before selecting syntax.
2. Prefer structural snippets before direct CST/AST nodes.
3. Discover node and field names; never invent them.
4. Test positive and near-miss negative fixtures.
5. Search and dry-run before applying rewrites.
6. Use the LLM to author one executable transformation, not to repeat the same edit across hundreds of files.
7. Preserve a clear boundary between upstream facts, curated guidance, and runtime-validated behavior.

## Upstream projects

- [GritQL](https://github.com/biomejs/gritql)
- [GritQL documentation](https://docs.grit.io/)
- [Biome](https://github.com/biomejs/biome)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)
- [Biome linter plugins](https://biomejs.dev/linter/plugins/)

See [`skills/gritql/references/sources.md`](skills/gritql/references/sources.md) for detailed source provenance.

## License

MIT. Upstream project names and trademarks belong to their respective owners.
