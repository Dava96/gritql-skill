# Standalone Grit CLI A/B evaluation

This suite is intentionally separate from `evals/biome-monorepo`. It evaluates the standalone Grit runtime, executable Markdown fixtures, and the pinned local CLI rather than Biome linter plugins.

The harness creates two disposable, identical Git repositories outside this checkout. The Grit npm package is pinned inside each fixture project; it is not a dependency of the skill package.

## Run

```bash
npm run standalone:prepare
npm run standalone:run -- --model <provider/model> --thinking high
npm run standalone:score
npm run standalone:cleanup
```

Agents receive one fresh Pi session per case. Both conditions use `--no-skills`; the treatment condition explicitly loads only the isolated GritQL skill. Service failures retry three times with backoff. Use `--order with-first`, `--dry-run`, `--condition <with-skill|without-skill>`, `--start <id>`, `--cases <id,id>`, and `--attempts <n>` as needed.

Pass `--root <directory>` to all commands to place the two disposable repositories somewhere other than the parent of this project.

## Score

| Category | Points |
|---|---:|
| Exact final source output | 40 |
| Eight retained Markdown patterns with explicit target languages | 8 |
| Pinned-runner Markdown tests pass | 8 |
| Original-input replay, hidden generalization probes, and idempotence | 32 |
| Version, test, apply, replay, and idempotence report evidence | 6 |
| No committed changes outside allowed evaluation paths | 6 |
| **Total** | **100** |

The scorer restores each original input, applies the retained pattern by its local name, checks an unseen variant with different expressions and layouts, applies the visible case again, and restores the agent's final file. This distinguishes general executable migrations from manually edited or fixture-hard-coded source.
