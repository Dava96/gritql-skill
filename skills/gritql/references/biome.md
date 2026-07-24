# GritQL in Biome

Biome's GritQL implementation is related to, but not identical with, standalone Grit/Marzano. Validate every plugin with the project's installed Biome version.

## Current capability profile

As of the sources reviewed for this skill:

- Biome supports GritQL target languages **JavaScript/TypeScript, CSS, and JSON**.
- Analyzer plugins can report diagnostics with `register_diagnostic()` and may offer `=>` rewrites.
- `biome search` performs structural search but does **not** apply rewrites.
- Biome-specific direct CST matching uses `engine biome(1.0)` and PascalCase node names.
- GritQL support is still evolving; some standalone Grit features are absent or behave differently.

Inspect the user's Biome version and current docs before relying on this matrix.

## Plugin shape

A minimal JavaScript/TypeScript plugin:

```grit
engine biome(1.0)
language js(typescript, jsx)

`Object.assign($args)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Prefer object spread instead of `Object.assign()`."
    )
}
```

Register it in `biome.json` or `biome.jsonc`:

```json
{
  "plugins": ["./plugins/no-object-assign.grit"]
}
```

Restrict it to selected files when appropriate:

```json
{
  "plugins": [
    {
      "path": "./plugins/react-rule.grit",
      "includes": ["src/components/**", "!src/**/*.test.tsx"]
    }
  ]
}
```

When `includes` is present, at least one positive glob must match and no negated glob may match. An empty list runs the plugin nowhere.

## `register_diagnostic()`

Supported arguments:

| Argument | Required | Values/meaning |
|---|---:|---|
| `span` | yes | Bound syntax node to highlight. Prefer the smallest useful node. |
| `message` | yes | Diagnostic text. |
| `severity` | no | `hint`, `info`, `warn`, or `error`; defaults to `error`. |
| `fix_kind` | no | `safe` or `unsafe`; rewrites default to unsafe. |

Example with a safe fix:

```grit
engine biome(1.0)
language js(typescript, jsx)

`console.log($message)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Use console.info instead of console.log.",
        severity = "warn",
        fix_kind = "safe"
    ),
    $call => `console.info($message)`
}
```

Behavior:

- no `--write`: show the diagnostic and fix suggestion;
- `--write`: apply `fix_kind = "safe"` rewrites;
- `--write --unsafe`: also apply unsafe rewrites;
- omitted `fix_kind`: rewrite is unsafe.

A rewrite without `register_diagnostic()` is not a complete linter rule. A diagnostic's `fix_kind` matters only when the same match also performs a rewrite.

Plugin diagnostics may be suppressed with a `lint/plugin` suppression comment. Test suppressions if the rule will be adopted across an existing codebase.

## Testing a plugin

Use the project's package manager and installed Biome binary. Typical commands are:

```bash
pnpm exec biome --version
pnpm exec biome lint path/to/violating-fixture.ts
pnpm exec biome lint path/to/valid-fixture.ts
pnpm exec biome lint --write path/to/rewrite-fixture.ts
```

Equivalent launchers include `npm exec biome --`, `yarn biome`, and `bunx biome`. Prefer an existing project script if one is defined. Do not silently download a different Biome release to validate a project plugin.

A robust fixture test has:

```text
plugin-test/
├── biome.json
├── rule.grit
├── invalid.ts       # must emit the expected message/span
├── valid.ts         # must emit no plugin diagnostic
└── expected.ts      # expected safe rewrite, if applicable
```

Test in this order:

1. Run lint on `rule.grit` or format/check it with the project tool so parser errors are visible.
2. Lint `invalid.ts`; assert diagnostic text and useful span.
3. Lint `valid.ts`; assert no plugin diagnostic.
4. Copy `invalid.ts`, apply `--write` (and `--unsafe` only when intentional), and compare with `expected.ts`.
5. Lint the rewritten file again; it should normally produce no rule diagnostic.
6. Add regression fixtures for every false positive or false negative found.

Biome does not infer the intended target language from a plugin filename. Declare it explicitly, especially for CSS and JSON.

## Search before linting

Use `biome search` to develop a pure match before adding diagnostics or rewrites:

```bash
pnpm exec biome search '`console.log($message)`' src
```

Use single quotes around shell queries containing backticks. When invoking the executable without a shell (for example, an argument array in Node), pass the backticks literally and do not add shell quotes.

`biome search` currently cannot execute `=>` rewrites. Use it to inspect match coverage, then move the validated pattern into a plugin for diagnostics/fixes.

For piped code:

```bash
printf 'let value = 1;\n' | pnpm exec biome search '`let $var = $value`' --stdin-file-path=fixture.ts
```

## Snippet-first plugin examples

### Ban a method regardless of argument count

Use anonymous `$...` when the arguments are irrelevant. A named metavariable in the argument position (such as `$args`) may instead bind the runtime's complete argument-list field, so do not assume it means “exactly one argument.” Use `$first, $...` when the rule must require at least one argument.

```grit
`$collection.forEach($...)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Prefer for...of over forEach()."
    )
}
```

### Restrict imports

```grit
`import $_ from $source` where {
    $source <: or { `'lodash'`, `'underscore'`, `'moment'` },
    register_diagnostic(
        span = $source,
        message = "Use an approved dependency instead."
    )
}
```

To catch multiple syntax shapes, use one top-level `or` and unify bindings deliberately:

```grit
or {
    `import $_ from $source`,
    `require($source)`
} where {
    $source <: or { `'lodash'`, `'underscore'` },
    register_diagnostic(
        span = $source,
        message = "This dependency is restricted."
    )
}
```

### Multiple independent checks in one plugin

```grit
or {
    `debugger` as $match where {
        register_diagnostic(span = $match, message = "Remove debugger statements.")
    },
    `alert($...)` as $match where {
        register_diagnostic(span = $match, message = "Remove alert() calls.")
    }
}
```

Prefer one focused rule per file when separate ownership, messages, include globs, or rollout schedules are useful.

## Biome CST patterns

Use CST nodes when snippets cannot express the required structural constraint:

```grit
engine biome(1.0)
language js(typescript, jsx)

JsCatchClause(
    body = JsBlockStatement(statements = [])
) as $catch where {
    register_diagnostic(
        span = $catch,
        message = "Empty catch blocks are not allowed."
    )
}
```

Discover node and field names from:

1. the **Syntax** tab in the Biome Playground for representative source;
2. the `.ungram` grammar files in the matching Biome source version;
3. existing tests/patterns in that Biome release.

Do not copy a node name from a newer website into an older project without validation. Names can change.

### CSS

```grit
engine biome(1.0)
language css

`color: $value` as $declaration where {
    $value <: r"#[0-9a-fA-F]+",
    register_diagnostic(
        span = $value,
        message = "Use a CSS custom property instead of a hex color.",
        severity = "warn"
    )
}
```

### JSON

Current Biome documentation cautions that JSON snippet metavariable support is limited. Prefer direct CST nodes when a snippet fails:

```grit
engine biome(1.0)
language json

JsonMemberName() as $name where {
    $name <: r".*_.*",
    register_diagnostic(
        span = $name,
        message = "JSON keys must use camelCase.",
        severity = "warn"
    )
}
```

Regex sees the full rendered node, including quotes around a JSON member name.

## Biome-specific failure checklist

If a plugin parses but does not behave correctly, check:

- Is the plugin path resolved relative to the intended Biome config?
- Do `plugins[].includes` globs include the fixture?
- Is the target one of the Biome-supported languages?
- Does the declaration include the needed `typescript` or `jsx` flavor?
- Is argument cardinality explicit and fixture-tested (`$...`, a named list binding, or `$first, $...`)?
- Is `register_diagnostic()` inside the arm that actually matched?
- Is the span bound in every `or` arm that reaches the shared `where` clause?
- Did a guessed CST field use a Tree-sitter name rather than Biome's field name?
- Is a fix omitted because it defaults to unsafe and the command used only `--write`?
- Is a generic `lint/plugin` suppression hiding the result?
- Is the project executing a different Biome version than the one inspected?
