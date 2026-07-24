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
4. **Grow the query.** Start with a backtick snippet, add metavariables, then `where` constraints and traversal. Use direct syntax-tree nodes only after discovering their exact runtime-specific names and fields. Add rewrites last.
5. **Execute narrowly.** Run the pure query on fixtures, then diagnostics, then any rewrite on a copy. Compare exact output and run a second pass to check idempotence.

If the required runner is unavailable, say **not runtime-validated**, give the exact command to run, and do not claim the pattern works.

## GritQL and standalone pattern requirements

- Declare the target language and use the target Grit version's syntax and node grammar.
- Put reusable executable Markdown patterns under `.grit/patterns` and run `grit patterns test`.
- In Grit Markdown tests, one code block is a positive search case; two blocks are input/output; two identical blocks encode a negative rewrite case.
- Before applying a codemod broadly, inspect matches or a dry run, narrow the path, review the diff, run project checks, and rerun for idempotence.
- Treat `multifile`, `$new_files`, JavaScript functions, and standard-library helpers as runtime-specific features rather than universal GritQL.

See [examples/standalone-refactor](examples/standalone-refactor/README.md).

## Biome integration requirements

- Confirm the target is JavaScript/TypeScript, CSS, or JSON, the languages currently documented by Biome.
- Every successful lint-rule path must call `register_diagnostic()` with a bound `span` and a `message`.
- Use `severity = "hint" | "info" | "warn" | "error"` only; it defaults to `error`.
- A rewrite without `fix_kind` is unsafe. `--write` applies safe fixes; `--write --unsafe` also applies unsafe fixes.
- Mark a fix safe only when the matched rewrite cannot change intended behavior. If uncertain, use `unsafe` or omit the fix.
- Develop matching with `biome search`, but validate diagnostics and fixes with `biome lint` or `biome check`.
- Scope rollout with `plugins[].includes` when the policy is not repository-wide, and test suppression with `lint/plugin` when relevant.

See the runtime-tested integration fixture in [examples/biome-plugin](examples/biome-plugin/README.md).

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