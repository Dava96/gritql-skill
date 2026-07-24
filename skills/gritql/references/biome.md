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

Without `includes`, the plugin runs on every supported file Biome processes. With it, a file must match a positive glob and no negated glob. Paths follow Biome's glob rules. Plugin diagnostics can be suppressed with `// biome-ignore lint/plugin: reason`; test this when suppression is part of rollout.

## Plugin API

`register_diagnostic()` accepts:

| Argument | Required | Contract |
|---|---:|---|
| `span` | yes | A bound syntax node to highlight. Prefer the smallest actionable node. |
| `message` | yes | The user-facing diagnostic. |
| `severity` | no | `hint`, `info`, `warn`, or `error`; defaults to `error`. |
| `fix_kind` | no | `safe` or `unsafe`; a rewrite defaults to unsafe. |

A fix must register its diagnostic and rewrite on the same successful path:

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

JSON snippets and CST names are version-sensitive. Start with the documented snippet syntax, then inspect the target runtime's CST when it does not express the needed match.

## Validation loop

Use the project's local launcher and existing Biome version. For example:

```bash
pnpm exec biome --version
pnpm exec biome search '`console.log($arguments)`' path/to/fixtures
pnpm exec biome lint path/to/invalid.ts --colors=off --max-diagnostics=none
pnpm exec biome lint path/to/valid.ts --colors=off --max-diagnostics=none
pnpm exec biome lint --write path/to/safe-fix-copy.ts
pnpm exec biome lint --write --unsafe path/to/unsafe-fix-copy.ts
```

Validate in this order:

1. Pure match count on violating and near-miss fixtures.
2. Exact plugin message and useful span—not just nonzero exit status.
3. Zero, one, and multiple list elements when cardinality matters.
4. Include/exclude globs and suppression when used.
5. Rewrite output on a copy with the appropriate write flag.
6. Parsing, formatting, type checking, project tests, and an idempotent second pass.

Do not silently download another Biome release to validate a project plugin. If the local binary is unavailable, report the plugin as not runtime-validated.

## Official references

- [Biome linter plugins](https://biomejs.dev/linter/plugins/)
- [Biome GritQL reference](https://biomejs.dev/reference/gritql/)
- [Biome plugin recipes](https://biomejs.dev/recipes/gritql-plugins/)
- [Biome Playground](https://biomejs.dev/playground/)
- [Plugin suppressions](https://biomejs.dev/analyzer/suppressions/#plugin-suppressions)