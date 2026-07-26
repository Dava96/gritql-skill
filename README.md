# Unofficial GritQL Skill

[![skills.sh](https://skills.sh/b/Dava96/gritql-skill)](https://skills.sh/Dava96/gritql-skill)

An agent skill for writing and testing standalone GritQL patterns, structural rewrites, and Biome linter plugins.

> This is an unofficial community project. It is not affiliated with or endorsed by Biome, Grit, Grit.io, Honeycomb, or their maintainers.

## Install

```bash
npx skills@latest add Dava96/gritql-skill
```

With Pi:

```bash
pi install git:github.com/Dava96/gritql-skill
```

Or copy [`skills/gritql`](skills/gritql) into your agent's skills directory.

## What it helps with

- choosing the correct standalone Grit or Biome runtime;
- writing patterns without hard-coding the example;
- testing positive cases, near misses, replay, and second-pass safety;
- creating scoped Biome diagnostics and fixes;
- avoiding broad or unverified rewrites.

## Evaluation

We gave the same model the same tasks with and without the skill, then checked the output and reran the saved migrations.

| Test | Model | Without | With | Change |
|---|---|---:|---:|---:|
| Biome, one session | GPT-5.6 Sol | 90 | 100 | +10 |
| Biome, one session | GPT-5.4 Mini | 69 | 88 | +19 |
| Biome, fresh session per task | GPT-5.4 Mini | 69 | 94 | +25 |
| Biome, early one-session test | GPT-5.3 Codex Spark | 16 | 16 | 0 |
| Standalone Grit, fresh session per task | GPT-5.4 Mini | 81 | 96 | +15 |

These are individual paired runs, not benchmark averages. Later runs used stricter replay and unseen-example checks after earlier runs exposed those failure modes.

## Documentation

- [GritQL language](https://docs.grit.io/language/overview)
- [Biome linter plugins](https://biomejs.dev/linter/plugins/)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)

## License

MIT. Upstream names and trademarks belong to their respective owners.
