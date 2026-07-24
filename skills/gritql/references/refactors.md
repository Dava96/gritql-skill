# Structural refactors with standalone Grit

This workflow targets the standalone Grit/Marzano CLI. Do not assume advanced constructs here are supported by Biome.

## When a refactor should become a pattern

A GritQL refactor is a strong choice when you can define:

1. a structural signature for every intended target;
2. explicit exclusions for lookalikes;
3. a deterministic output for each target class;
4. tests for both transformed and untouched cases.

The economic advantage comes from spending model tokens once to create an executable rule, then running the rule cheaply and reproducibly across the codebase.

## Repository layout

Reusable patterns may live in `.grit/patterns`:

```text
.grit/
├── grit.yaml
└── patterns/
    ├── rename_client_method.md
    └── helpers.grit
```

A `.grit` file can define a named pattern:

```grit
language js

pattern rename_client_method() {
    `$client.oldMethod($args)` => `$client.newMethod($args)`
}
```

Markdown is useful because it combines the query, documentation, and executable samples.

## Executable Markdown pattern

````markdown
---
tags: [migration, api]
---

# Rename client method

Rename calls to the deprecated client API.

```grit
language js

`$client.oldMethod($args)` => `$client.newMethod($args)`
```

## Rewrites a direct call

```typescript
client.oldMethod(value);
```

```typescript
client.newMethod(value);
```

## Leaves another object untouched after adding a project-specific constraint

```typescript
unrelated.oldMethod(value);
```

```typescript
unrelated.oldMethod(value);
```
````

Markdown conventions used by the standalone test runner:

- filename (without `.md`) becomes the pattern name;
- first heading is the title;
- first non-heading paragraph is the description;
- first fenced code block is the GritQL body;
- each subheading introduces a sample;
- one code block means the pattern is expected **not to match** (a negative case);
- two blocks are input and expected output;
- for a search-only pattern, two identical blocks can assert a successful match whose rendered output is unchanged;
- `// @filename: path` may represent multifile samples.

This single-block behavior is verified against the current Grit test-runner implementation. Some older documentation describes it inconsistently, so execute a tiny positive and negative sample with the installed CLI before relying on Markdown tests in a different release.

Run:

```bash
grit patterns test
grit patterns test --filter=rename_client_method
```

Use the CLI's watch option if supported by the installed version while iterating.

## Safe execution loop

For an inline pattern:

```bash
grit apply '`console.log($message)`' src --dry-run
grit apply '`console.log($message)` => `logger.info($message)`' src --dry-run
```

For a named pattern:

```bash
grit patterns test --filter=rename_client_method
grit apply rename_client_method src --dry-run
grit apply rename_client_method src --interactive
```

Exact flags can change; inspect `grit apply --help` for the installed version. The critical order is:

1. test fixtures;
2. search-only dry run;
3. rewrite dry run;
4. interactive or narrow-path apply;
5. inspect diff and run project validation;
6. broaden scope;
7. rerun to check idempotence.

Do not start with an unrestricted mutating `grit apply`.

## Evolving a migration

Suppose the goal is to replace a deprecated method only on instances of `TargetClient`.

### Stage 1: broad discovery

```grit
`$instance.oldMethod($args)`
```

Run this as search/dry-run and classify results. Record shapes that are true targets and false positives.

### Stage 2: add context

```grit
`$instance.oldMethod($args)` as $call where {
    $program <: contains `$instance = new TargetClient($...)`
}
```

This is more selective, but test aliases, constructor injection, property fields, and multiple instances. A syntactic condition is not type analysis.

### Stage 3: add the rewrite

```grit
`$instance.oldMethod($args)` as $call where {
    $program <: contains `$instance = new TargetClient($...)`,
    $call => `$instance.newMethod($args)`
}
```

### Stage 4: handle imports and exceptions

Do not bolt import edits onto the rule until call-site matching is stable. Add separate tested steps or use known helpers from the installed standard library. List call sites that cannot be migrated safely and leave them unchanged or mark them for manual work.

## Scoping and repeated matches

Metavariables unify within a scope. If a descendant query should independently bind each occurrence, introduce a `bubble`:

```grit
`function $name() { $body }` where {
    $body <: contains bubble($name) {
        `console.log($message)` => `logger.info($name, $message)`
    }
}
```

Arguments passed to `bubble(...)` preserve outer bindings. Variables not passed in are local to the bubble.

The runtime normally auto-wraps a simple root query so it can match multiple places independently. Explicit `file(...)`, `sequential`, and `multifile` patterns may require manual `contains bubble` structure.

## Sequential refactors

Use a top-level `sequential` only when later steps must see earlier rewrites:

```grit
language js

sequential {
    bubble file($body) where {
        $body <: contains `console.log($message)` => `console.warn($message)`
    },
    bubble file($body) where {
        $body <: contains `console.warn($message)` => `console.info($message)`
    }
}
```

`sequential` is top-level-only in standalone Grit and its steps are not auto-wrapped. Keep steps independent if order is unnecessary; sequential transformations are harder to reason about and test.

## Multifile refactors

Use `multifile` only when information gathered from one file must drive changes in others. Each step is evaluated across files with shared state, and the top level of each step must be a `file(...)` pattern (optionally preceded by `bubble`).

Before adopting `multifile`, ask whether the migration can instead be decomposed into:

1. a deterministic source declaration rewrite;
2. a separate import/reference rewrite with explicit module constraints.

Multifile patterns need multifile fixtures, collision cases, same-name symbols from different modules, and files that should remain untouched.

## Creating files

Standalone Grit exposes `$new_files` for patterns that generate files. This is generally preferable to `multifile` when no cross-file lookup is required. Treat generated paths as untrusted output: test collisions, existing files, path normalization, and idempotence.

## Refactor acceptance criteria

A migration is ready only when:

- every fixture passes under `grit patterns test`;
- dry-run match counts are understood;
- false positives are zero or explicitly accepted;
- false negatives from the sampled corpus are classified;
- the project builds/tests after application;
- comments and import ordering remain acceptable;
- rerunning produces no unexpected edits;
- the pattern and fixtures are retained when the migration will recur.
