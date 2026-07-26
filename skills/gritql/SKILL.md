---
name: gritql
description: Write, debug, test, and review GritQL queries, rewrites, standalone Grit patterns, Biome structural searches, and Biome linter plugins. Use for .grit files, codemods, Grit/Marzano, biome search, register_diagnostic(), or Biome plugins.
---

# GritQL

Treat every pattern as executable code. Identify its runtime, test positive and negative examples, and run it before claiming it works.

## Choose the runtime first

A `.grit` file does not identify its runtime.

- **Standalone Grit/Marzano:** `grit apply`, `grit patterns test`, `.grit/grit.yaml`, or `.grit/patterns`.
- **Biome search:** `biome search`. This tests matching only; it does not run plugin diagnostics or fixes.
- **Biome plugin:** configured in `biome.json`/`biome.jsonc` and usually calls `register_diagnostic()`.

Inspect the target project's installed version, configuration, nearby patterns, package-manager scripts, and target files. Use the project's local executable. Do not silently install another release.

Never mix standalone Tree-sitter node names with Biome CST names, and never use `register_diagnostic()` outside a Biome plugin.

## Workflow

1. **Write the contract.** Record the runtime, version, language, examples that must match, near misses that must not match, and intended output.
2. **Check tool fit.** GritQL is syntactic. Do not use it when correctness requires types, symbol identity, control flow, or data flow.
3. **Build fixtures.** Include repeated matches, formatting variants, already-correct code, and near misses that differ by one structural fact. Test zero, one, and many list items when cardinality matters.
4. **Start small.** Begin with a snippet and metavariables. Add constraints and direct syntax-tree nodes only when needed. Add the rewrite last.
5. **Validate narrowly.** Search first, apply to a copy, compare the exact output, restore the original input, replay the retained pattern, then run it again to prove the second pass changes nothing.

Never hard-code fixture literals, copy an entire fixture into a `program` query, or add one branch per visible example to simulate a general migration.

If the required runner is unavailable, say **not runtime-validated**, provide the command that still needs to run, and do not claim success.

## Core syntax

- `$name` binds a node. Reusing `$name` requires the same binding.
- `$_` ignores one value; `$...` ignores zero or more list items.
- `` `pattern` as $match `` binds the complete match.
- `where { ... }` adds conditions.
- `$node <: pattern` matches an existing binding; `=` assigns.
- `or { ... }` expresses alternatives. Keep one root query after any definitions.
- `contains` searches descendants; `within` searches ancestors.
- `not pattern` negates a pattern.

A metavariable called `$args` does not guarantee any cardinality. Test zero, one, and many arguments explicitly or constrain the argument list, for example `$arguments <: [$first, $second]`.

## Standalone Grit patterns

Put reusable patterns in `.grit/patterns/<name>.md`. The filename stem is the pattern name; put the root query directly in the fenced block and do not redefine the same name:

````markdown
---
tags: [migration]
---

```grit
language js

`client.oldMethod($arguments)` => `client.newMethod($arguments)`
```

## Rewrites a call

```typescript
client.oldMethod(first, second);
```

```typescript
client.newMethod(first, second);
```
````

Markdown sample rules have differed between documentation and releases. Probe the installed runner before building a suite. In Grit 0.1.1 rewrite tests, two blocks are input/output and a single block is an example that must remain unmatched.

Validate with the project's pinned CLI:

```bash
grit --version
grit patterns test --filter=<pattern-name>
grit apply <pattern-name> <narrow-path> --dry-run
grit apply <pattern-name> <narrow-path>
grit apply <pattern-name> <narrow-path>
```

Review the diff after each apply. Treat `multifile`, `file`, `$new_files`, JavaScript functions, and standard-library helpers as standalone features unless another runtime explicitly supports them.

## Biome plugins

The target project's Biome version is authoritative. Current Biome plugins support JavaScript/TypeScript, CSS, and JSON, but available syntax-tree nodes and fields can change.

Finish one plugin end-to-end before configuring the next. One invalid configured plugin can block every plugin.

Every rewrite branch must register its diagnostic and perform its rewrite on the same successful path:

```grit
language js(typescript)

`console.log($arguments)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Use console.info instead of console.log.",
        severity = "warn",
        fix_kind = "unsafe"
    ),
    $call => `console.info($arguments)`
}
```

Use exactly one root query. Combine independent alternatives with `or { ... }`, and make sure every successful branch reaches `register_diagnostic()`.

Default rewrites to `fix_kind = "unsafe"`. Use `safe` only when syntax alone proves behavior cannot change. Diagnostic-only rules should omit both the rewrite and `fix_kind`.

Scope each plugin with a positive glob that is proven to select the violating file:

```json
{
  "plugins": [
    {
      "path": "./plugins/use-console-info.grit",
      "includes": ["**/fixtures/invalid.ts"]
    }
  ]
}
```

Do not assume `path/**` or an exact repository-relative path selects direct files. “Checked 0 files,” zero expected plugin diagnostics, or a compile error is a hard failure.

### Snippets and direct nodes

Prefer target-language snippets. Use direct nodes only after checking the target Biome version's syntax tree or grammar. Standalone names such as `call_expression()` do not belong in Biome plugins.

A focused JSON key rewrite can use verified Biome CST names:

```grit
engine biome(1.0)
language json

JsonMember(name = $name) where {
    $name <: r"\"old_key\"",
    register_diagnostic(
        span = $name,
        message = "Rename old_key to new_key.",
        fix_kind = "unsafe"
    ),
    $name => `"new_key"`
}
```

For JSX, rewrite only the attribute name and constrain it with an ancestor snippet. This Biome 2.5 form preserves order, values, and spreads:

```grit
engine biome(1.0)
language js(typescript, jsx)

JsxAttribute(name = $name) as $attribute where {
    $name <: `filmStock`,
    $attribute <: within `<FilmBadge $... />`,
    register_diagnostic(
        span = $name,
        message = "Rename filmStock to emulsion.",
        fix_kind = "unsafe"
    ),
    $name => `emulsion`
}
```

Test self-closing and paired elements separately. An inline direct-node ancestor such as `$attribute <: within JsxSelfClosingElement(...)` can compile in Biome 2.5 while producing zero diagnostics.

### Required validation

Use the local launcher and name only a fixture or explicitly approved narrow path:

```bash
pnpm exec biome --version
pnpm exec biome search '`console.log($arguments)`' path/to/invalid.ts
pnpm exec biome lint path/to/invalid.ts --colors=off --max-diagnostics=none
pnpm exec biome lint --write --unsafe path/to/write-copy.ts --colors=off --max-diagnostics=none
pnpm exec biome lint --write --unsafe path/to/write-copy.ts --colors=off --max-diagnostics=none
```

Some versions support `--only=plugin`; test the installed CLI before relying on it. Without it, watch for unrelated built-in fixes.

Never run repository-wide `biome check --write`, `biome format --write`, or `biome lint --write`. Never manually edit the intended output and call the plugin successful. Restore the original fixture and prove the retained configured plugin reproduces the result.

## Common failures

| Symptom | What to do |
|---|---|
| Parse or compile error | Reduce to one small snippet; verify the language and runtime-specific node names. |
| No files processed | Fix the path and positive include glob before changing the query. |
| File processed, no plugin diagnostic | Check configuration, suppression, successful branches, and `register_diagnostic()`. |
| Too many matches | Add structural receiver, callee, cardinality, or ancestor constraints and near-miss fixtures. |
| Fix is not applied | Keep the rewrite beside the diagnostic and use `--write --unsafe` for unsafe fixes. |
| Correct-looking final source, replay fails | The source was edited manually or the retained pattern differs from what was tested. Restore the input and replay. |
| Second pass changes code | The rewrite is not idempotent; inspect its output and tighten the match. |

## Completion checklist

- [ ] Runtime, local version, language, and flavor are explicit.
- [ ] There is one root query.
- [ ] Positive, negative, near-miss, repeated-match, and cardinality fixtures ran.
- [ ] Direct node names came from the target runtime.
- [ ] Biome diagnostics use a focused bound span and conservative fix safety.
- [ ] The retained pattern reproduces the exact output from original input.
- [ ] The second pass makes no changes.
- [ ] Validation commands and results are reported.

## Official documentation

- [GritQL language](https://docs.grit.io/language/overview)
- [Grit pattern testing](https://docs.grit.io/guides/testing)
- [Biome linter plugins](https://biomejs.dev/linter/plugins/)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)
