# Biome plugin A/B evaluation

This agent-level stress test creates two isolated worktrees from the same commit of a configured TypeScript monorepo, seeds ten deliberately specific migrations, and runs the same Pi model under two conditions:

- **control:** skill discovery is disabled;
- **treatment:** discovery is disabled and only an isolated copy of this GritQL skill is loaded.

The target checkout itself is never checked out, reset, cleaned, or modified. Only disposable evaluation worktrees and local evaluation branches are mutated.

## What is measured

| Category | Points |
|---|---:|
| Exact migrated outputs across ten cases | 60 |
| Retained plugin and scoped configuration per case | 10 |
| Conservative rewrite-safety classification | 10 |
| Runtime/version/idempotence report | 5 |
| No changes outside the seeded evaluation directory except root `biome.jsonc` | 5 |
| Retained plugins replay each migration and a second unsafe write is idempotent | 10 |

The cases cover TypeScript, TSX, CSS, and JSON. They progress from callee renames and argument cardinality through JSX/CSS/JSON targeting, object construction, optional-chain near misses, and nested fluent-chain rewrites.

The public task specifies desired outcomes without teaching the workflow. Expected outputs remain outside the agent worktrees. The scorer separately checks scoping, runtime execution, safety classification, replay, and idempotence.

## 1. Prepare identical worktrees

Provide a local target repository explicitly:

```bash
npm run eval:prepare -- --repo <path-to-target-monorepo> --install
```

Alternatively, set `BIOME_EVAL_REPO` for all evaluation commands:

```powershell
$env:BIOME_EVAL_REPO = "C:\path\to\target-monorepo"
npm run eval:prepare -- --install
```

Preparation fetches the configured base, creates one shared seed commit, and creates local treatment and control branches in sibling disposable worktrees. Both conditions therefore start from the same source and dependency lockfile.

## 2. Run the pair

Choose one explicit model and thinking level for both conditions:

```bash
npm run eval:run -- --model <provider/model> --thinking high
```

The treatment receives an isolated temporary copy of the skill, preventing access to hidden expected outputs. Logs and metadata are written under the ignored `evals/biome-monorepo/results/` directory, and agent changes are committed automatically to the corresponding local branch.

Use `--order with-first` to reverse the default order. Add `--dry-run` to verify branches, worktrees, the pinned Biome installation, Pi, and final arguments without starting either agent.

For weaker models, use one fresh Pi session per migration while retaining earlier cases on the same branch:

```bash
npm run eval:run:per-case -- --model <provider/model> --thinking high
```

This reduces context pressure. Failed service calls retry with backoff. Interrupted runs can continue with `--condition <with-skill|without-skill> --start <id>`; `--cases <id,id>` reruns selected missing cases.

## 3. Score

```bash
npm run eval:score
```

The scorer:

1. compares all source files with hidden exact-output snapshots;
2. checks for one scoped retained plugin per migration;
3. inspects fix safety and committed path scope;
4. restores every original input and executes all retained plugins;
5. compares replayed output with the hidden snapshots;
6. executes a second pass and restores the agent's final bytes.

A positive **skill delta** means the treatment outscored the same model and starting commit without the skill.

## Reset

```bash
npm run eval:cleanup
```

Cleanup removes only the two known disposable worktrees and local evaluation branches. It refuses uncommitted changes unless `--force` is supplied.
