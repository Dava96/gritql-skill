# GritQL in Biome

Biome linter plugins use GritQL to match syntax, report custom diagnostics, and optionally suggest rewrites. The target project's installed Biome version is authoritative because support is still evolving.

## Capabilities and boundaries

Biome currently documents JavaScript/TypeScript, CSS, and JSON target languages. Plugins run through `biome lint` or `biome check`. `biome search` is useful for developing a pure structural match, but it does not execute `register_diagnostic()` or apply rewrites.

Before creating a plugin, check whether a built-in Biome rule already expresses the policy. GritQL matching is syntactic: aliases, shadowing, types, symbol identity, control flow, and data flow are not inferred.

## Minimal diagnostic plugin

```grit
language js(typescript, jsx)

`$function($arguments)` where {
    $function <: `Object.assign`,
    register_diagnostic(
        span = $function,
        message = "Prefer object spread instead of `Object.assign()`.",
        severity = "warn"
    )
}
```

The focused `$function` binding is the highlighted span. Bind the complete call with `as $call` when the whole invocation is the useful span or rewrite target.

Every independently successful lint-rule branch must reach `register_diagnostic()`. A pure match or rewrite is not a complete linter rule.

## Configuration and file scope

```json
{
  "plugins": [
    {
      "path": "./plugins/project-rule.grit",
      "includes": ["src/**/*.ts", "!src/**/*.test.ts"]
    }
  ]
}
```

Without `includes`, the plugin runs on every supported file Biome processes. With it, a file must match a positive glob and no negated glob. Paths follow the installed Biome version's glob rules. Prefer a concrete positive file glob such as `**/fixtures/invalid.ts` or `**/fixtures/*.ts`. Do not assume an exact repository-relative path or trailing `directory/**` selects direct files: run the violating file and prove the expected diagnostic count. “Checked 0 files” or zero plugin diagnostics means the scope is not validated. Plugin diagnostics can be suppressed with `// biome-ignore lint/plugin: reason`; test this when suppression is part of rollout.

## Plugin API

`register_diagnostic()` accepts:

| Argument | Required | Contract |
|---|---:|---|
| `span` | yes | A bound syntax node to highlight. Prefer the smallest actionable node. |
| `message` | yes | The user-facing diagnostic. |
| `severity` | no | `hint`, `info`, `warn`, or `error`; defaults to `error`. |
| `fix_kind` | no | `safe` or `unsafe`; a rewrite defaults to unsafe. |

A fix must register its diagnostic and rewrite on the same successful path. Use the canonical shape below, with the rewrite inside `where`, rather than inventing another operator layout. Never put two bare root rules one after another; use `or { ... }` for alternatives:

```grit
`console.log($arguments)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Use the project's preferred logger.",
        severity = "warn",
        fix_kind = "unsafe"
    ),
    $call => `console.info($arguments)`
}
```

This example is **unsafe** because changing the logging method can change observable logging behavior. Without `--write`, Biome only suggests the rewrite. `--write` applies safe fixes; `--write --unsafe` also applies unsafe or unclassified rewrites. Omit both the rewrite and `fix_kind` for a diagnostic-only rule.

## Snippets before CST nodes

Start with target-language snippets and use `$...` when list contents are irrelevant:

```grit
`$collection.forEach($...)` as $call where {
    register_diagnostic(
        span = $call,
        message = "Prefer `for...of` over `.forEach()`."
    )
}
```

Use direct nodes only when snippets cannot express the structural requirement:

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

Discover node and field names from the target version's Biome Playground **Syntax** tab or matching `.ungram` grammar files. Do not paste standalone Tree-sitter names such as `call_expression()` into a Biome query.

Declare non-JavaScript targets explicitly:

```grit
language css

`color: $value` as $declaration where {
    $value <: r"#[0-9a-fA-F]+",
    register_diagnostic(
        span = $value,
        message = "Use a CSS custom property instead."
    )
}
```

JSON snippets and CST names are version-sensitive. Start with the documented snippet syntax, then inspect the target runtime's CST when it does not express the needed match. For example, after verifying these names in the target version, a focused key rewrite can use:

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

For JSX, rewrite the focused attribute name while constraining the attribute with a verified ancestor snippet. This Biome 2.5 form preserves attribute order and spreads:

```grit
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

Test self-closing and paired elements separately when both are in scope. Do not assume an inline direct-node ancestor such as `$attribute <: within JsxSelfClosingElement(...)` works merely because it compiles: in Biome 2.5 it can yield zero plugin diagnostics. The required nonzero lint gate is authoritative.

## Validation loop

Use the project's local launcher and finish one plugin before configuring the next:

```bash
pnpm exec biome --version
pnpm exec biome search '`console.log($arguments)`' path/to/invalid.ts
pnpm exec biome lint path/to/invalid.ts --colors=off --max-diagnostics=none
cp path/to/invalid.ts path/to/write-copy.ts
pnpm exec biome lint --write --unsafe path/to/write-copy.ts --colors=off --max-diagnostics=none
pnpm exec biome lint --write --unsafe path/to/write-copy.ts --colors=off --max-diagnostics=none
```

Some Biome versions accept `--only=plugin` to isolate plugins from built-in rules; test the installed CLI before relying on it. Otherwise mutate only a copy, inspect every changed line, and skip or restore unrelated built-in fixes.

Gate each plugin in this order:

1. Record the local version and target language.
2. Run the pure query on positive and near-miss fixtures.
3. Configure only this plugin with an explicit file glob.
4. Run diagnostic-only lint and require the exact nonzero message count and focused span. Zero processed files, zero plugin messages, or any compile error is a hard stop.
5. Test zero/one/many list elements where relevant.
6. Apply the rewrite only to a copy; compare exact output and confirm no unrelated built-in fix ran.
7. Restore a fresh input copy and prove the retained plugin reproduces the output without manual edits.
8. Run a second write pass, parsing, type checks, and project tests before starting another rule.

Never use a repository root as the path to `check --write`, `format --write`, or `lint --write`. Do not silently download another Biome release. If the local binary is unavailable, report **not runtime-validated**.

## Official references

- [Biome linter plugins](https://biomejs.dev/linter/plugins/)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)
- [Biome plugin recipes](https://biomejs.dev/recipes/gritql-plugins/)
- [Biome Playground](https://biomejs.dev/playground/)
- [Plugin suppressions](https://biomejs.dev/analyzer/suppressions/#plugin-suppressions)