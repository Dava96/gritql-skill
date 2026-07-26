---
name: gritql
description: Write, debug, test, and review GritQL queries, rewrites, standalone patterns, and Biome linter plugins. Use for .grit files, structural code search or codemods, Grit/Marzano, biome search, Biome plugins, register_diagnostic(), plugins[].includes, or custom Biome diagnostics and fixes.
license: MIT
compatibility: Standalone workflows require a compatible Grit CLI. Biome integrations require the target project's Biome CLI.
metadata:
  author: David
  version: "0.1.0"
---

# GritQL

Treat a GritQL pattern as executable code: identify its runtime, build positive and negative fixtures, and run it before calling it valid.

## Route the task first

A `.grit` file alone does not identify the runtime.

- **GritQL or standalone Grit/Marzano:** a query, rewrite, `.grit/grit.yaml`, `.grit/patterns`, `grit apply`, or `grit patterns test`. Read [references/language-core.md](references/language-core.md).
- **Biome structural search:** invoked with `biome search`. Read the language reference, then [references/biome.md](references/biome.md) for Biome's supported subset. Search does not execute plugin diagnostics or rewrites.
- **Biome linter plugin:** configured under `plugins` in `biome.json`/`biome.jsonc`, or calls `register_diagnostic()`. Read both references.
- **Failure investigation:** after identifying the runtime, use [references/troubleshooting.md](references/troubleshooting.md).

Inspect the target project's version, configuration, nearby patterns, target files, and package-manager scripts before authoring syntax. The installed target runtime is authoritative.

## Authoring workflow

1. **State the contract.** Record runtime and version, target language/flavor, examples that must match, near misses that must not match, and the intended diagnostic or rewrite.
2. **Check tool fit.** Avoid syntax-only GritQL when correctness needs types, symbol resolution, control flow, or data flow. For a Biome policy, prefer an existing built-in rule when it already fits.
3. **Create fixtures.** Include formatting variants, repeated matches, an already-correct case, and one near miss differing by a single structural fact. Add zero/one/many-element cases when matching argument or item lists.
4. **Grow the query.** Start with a snippet and metavariables; never hard-code fixture literals or add one arm per example. Add constraints, verified direct nodes, and rewrites last.
5. **Execute narrowly.** Run the pure query on fixtures, then diagnostics, then any rewrite on a copy. Compare exact output and run a second pass to check idempotence.

If the required runner is unavailable, say **not runtime-validated**, give the exact command to run, and do not claim the pattern works.

## GritQL and standalone pattern requirements

- Declare the target language and use its installed node grammar. Never match a whole fixture or `program` merely to encode local rewrites.
- In `.grit/patterns/*.md`, the filename stem is the pattern name: put the root query directly in the `grit` fence, do not redefine that name, and run `grit patterns test`.
- Markdown sample semantics differ across Grit releases and documentation. Probe the installed test runner with a tiny positive and negative case before encoding fixtures.
- Before applying a codemod broadly, inspect matches or a dry run, narrow the path, review the diff, run project checks, and rerun for idempotence.
- Treat `multifile`, `$new_files`, JavaScript functions, and standard-library helpers as runtime-specific features rather than universal GritQL.

See [examples/standalone-refactor](examples/standalone-refactor/README.md).

## Biome plugin hard gates

Finish one rule end-to-end before starting another. Never batch unvalidated plugins: one compile failure can block every configured rule.

Every rewrite branch must use this shape, with the rewrite **inside the same `where` block**:

```grit
`pattern` as $match where {
    register_diagnostic(
        span = $match,
        message = "Actionable message.",
        severity = "warn",
        fix_kind = "unsafe"
    ),
    $match => `replacement`
}
```

- Declare the language. Keep exactly one root query; combine alternatives with `or { ... }`.
- Default fixes to `unsafe`. Use `safe` only with a stated syntax-level proof that behavior cannot change.
- Scope each plugin to an actual file glob such as `**/fixtures/invalid.ts`. Do not assume `path/**` includes direct files.
- Run `biome lint` on the exact violating fixture before any write and require the expected **nonzero** diagnostic count. “Checked 0 files,” zero plugin diagnostics, or a compile error is failure—stop and fix it.
- Never manually edit the intended output to simulate success. Apply the plugin to a copy, compare exact output, restore the original input, replay the plugin, and run a second pass.
- Never run repository-wide `biome check --write`, `biome format --write`, or `biome lint --write`. Mutating commands must name only copied fixtures or an explicitly approved narrow path.

See [references/biome.md](references/biome.md) and the runtime-tested [example](examples/biome-plugin/README.md).

## Completion checklist

- [ ] Runtime, version, language, and flavors are explicit.
- [ ] One root query exists after any definitions.
- [ ] Repeated named metavariables intentionally require the same binding.
- [ ] List/argument cardinality is fixture-tested.
- [ ] Positive, negative, near-miss, and repeated-match fixtures execute.
- [ ] Direct node and field names came from the target runtime's syntax tree or grammar.
- [ ] Diagnostics use a focused, always-bound span.
- [ ] Rewrite safety, output, parsing, project checks, and second-pass behavior are verified.
- [ ] Validation commands and results are reported.

Never paste standalone Tree-sitter nodes into Biome, invent Biome CST fields, use `register_diagnostic()` outside Biome, or present a visually plausible query as tested.