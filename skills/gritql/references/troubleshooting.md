# Troubleshooting GritQL

First identify the failing stage: runtime/config discovery, compilation, matching, diagnostic registration, or rewrite application. Change one layer at a time.

## Confirm the runtime

Record the executable and version. Inspect which config is discovered and whether the `.grit` file is a Biome plugin, a `biome search` query, or a standalone Grit pattern. Do not debug a Biome plugin with a standalone runner or vice versa.

For Biome, check the plugin path, `plugins[].includes`, target file extension, and `typescript`/`jsx` flavor. Use the project's local package-manager command rather than a global or newly downloaded release.

## Reduce to a pure match

Remove definitions, effects, and rewrites until only the smallest snippet remains. For Biome:

```bash
pnpm exec biome search '`console.log($...)`' path/to/fixture.ts
```

Backticks are shell syntax. Single-quote the query in Bash-like shells; in PowerShell prefer a `.grit` file, literal here-string, or argument API.

Reintroduce one item at a time:

1. language and flavors;
2. metavariable/list cardinality;
3. each `where` condition;
4. traversal or direct node field;
5. helper or built-in call;
6. `register_diagnostic()` for a Biome plugin;
7. rewrite.

`biome search` proves only the match. It does not prove plugin diagnostics or fixes.

## Common failures

| Symptom | Checks |
|---|---|
| Compile error | Multiple root queries; missing comma; unsupported runtime feature; wrong built-in signature; invented node/field; variable used outside its scope. |
| No matches | Wrong target language/flavor; snippet invalid in that syntax position; named variables unintentionally unified; zero/one/many list behavior; overrestrictive `where`; wrong CST dialect. |
| Too many matches | Add structural callee/source/context evidence; use `within`, `contains`, or `not`; narrow plugin includes; reconsider whether types or symbol identity are required. |
| Search matches, plugin is silent | Plugin not configured; includes exclude fixture; successful branch does not call `register_diagnostic()`; span unbound in an `or` arm; `lint/plugin` suppression active. |
| Wrong span | Bind the smallest source, attribute, call, or value users should act on with `as` or a verified node field. |
| Fix is not applied | Safe fixes require `fix_kind = "safe"` and `--write`; unsafe/unclassified fixes require `--write --unsafe`; the rewrite must share the diagnostic's successful path. |
| Malformed output | Rewrite a smaller binding; preserve required metavariables; test comments, precedence, optional syntax, and empty/multiple list elements. |
| Only first occurrence matches | Check repeated named bindings and scope; in standalone Grit, use an appropriate `bubble` when each descendant needs independent bindings. |

## Prove a Biome plugin loads

Temporarily use a distinctive trivial rule in the correct language:

```grit
language js

`debugger` as $match where {
    register_diagnostic(
        span = $match,
        message = "TEMP: plugin loaded"
    )
}
```

Run it against a dedicated fixture containing `debugger`. If it fails, fix config, includes, language, or compilation before restoring the complex query.

## Rewrite safety

A parseable rewrite can still change behavior. Test the exact output, then run formatter, parser, type checker, and project tests. Run the write command twice; the second pass should make no further change. If syntax alone cannot establish safety, classify the fix unsafe or remove it.

For standalone codemods, search or dry-run narrowly before applying, inspect every match class, and preserve a reviewable Git diff.