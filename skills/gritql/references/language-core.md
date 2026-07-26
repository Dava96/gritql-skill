# GritQL language core

GritQL structurally searches and optionally rewrites syntax trees. The official language docs primarily describe standalone Grit; Biome implements a subset with its own syntax-tree node names and plugin API. Confirm the runtime before using advanced features.

## Program shape and target language

A program contains definitions followed by one root query:

```grit
language js(typescript, jsx)

pattern is_debug_call() {
    or { `console.log($...)`, `console.debug($...)` }
}

is_debug_call()
```

Common declarations are `language js`, `language js(typescript)`, `language js(typescript, jsx)`, `language css`, and `language json`. Standalone Grit supports additional languages; Biome currently documents only JavaScript/TypeScript, CSS, and JSON.

## Structural snippets and metavariables

Backticks contain code in the target language:

```grit
`console.$method($argument)`
`$left && $left()`
```

Formatting and usually quote style are ignored. Repeating `$left` requires both occurrences to bind the same structure.

| Form | Meaning |
|---|---|
| `$value` | Named binding. In some list positions it can bind the complete list field. |
| `$_` | Anonymous binding for an irrelevant value. |
| `$...` | Anonymous spread matching zero or more list elements. |
| `$first, $...` | One required element followed by zero or more. |
| `` `pattern` as $match `` | Bind the complete matched node. |

Names follow `$[a-zA-Z_][a-zA-Z0-9_]*`. Use `$[name]Suffix` to separate a metavariable from adjacent output text. Test zero, one, and multiple arguments instead of inferring cardinality from a name such as `$args`.

## Conditions and composition

Use `where` to attach conditions and `<:` to structurally match an existing binding:

```grit
`console.$method($...)` where {
    $method <: or { `log`, `debug` }
}
```

- Comma-separated conditions must all succeed.
- `<:` matches; `=` assigns a value; `==` compares resolved values where supported.
- `not PATTERN` negates a pattern; `! CONDITION` negates a condition.
- `or { ... }` short-circuits at the first matching arm.
- `any { ... }` tries every arm and may run multiple effects.
- `and { ... }` requires every arm.
- `maybe PATTERN` succeeds even when its child does not.

A shared `where` after `or` may only reference variables bound by every arm.

## Traversal and scope

- `contains PATTERN` searches descendants.
- `within PATTERN` searches ancestors.
- `before` and `after` match nearby syntax-tree nodes.
- `some` and `every` apply a pattern to elements of a list.
- `bubble` creates an inner metavariable scope; arguments such as `bubble($name)` carry selected outer bindings into it.

```grit
`function $name() { $body }` where {
    $body <: contains bubble($name) {
        `console.log($message)` as $call
    }
}
```

Standalone Grit auto-wraps ordinary root patterns so they can match repeatedly in a file. Explicit `file`, `sequential`, or `multifile` patterns change scoping and execution. Do not assume identical scoping in another runtime without fixtures. Matching an entire `program` or copying a complete fixture into a query is valid only for a genuinely file-level contract, not as a shortcut for local rewrites.

## Rewrites

`=>` replaces the left match with the right value:

```grit
`client.oldMethod($argument)` => `client.newMethod($argument)`
```

Delete with the empty pattern:

```grit
`debugger` => .
```

Prefer rewriting the smallest binding that changes. This better preserves comments, modifiers, and surrounding syntax:

```grit
`function $name($args) { $body }` where {
    $name <: `oldName` => `newName`
}
```

A rewrite being syntactically valid does not make it semantically safe.

## Regex, lists, maps, and functions

Regex patterns use `r"..."` and match the full rendered node/value. Add `.*` only for intentional substring matching. Captures such as `r"Hello, (.*)"($name)` are runtime-sensitive and need tests.

Grit state can contain lists (`[1, 2]`), maps (`{ key: value }`), indexed values (`$items[0]`, `$items[-1]`), assignments (`=`), and accumulations (`+=`). These are useful for complex standalone patterns but often unnecessary for lint rules.

Reusable patterns, predicates, and functions must be defined before the root query. Functions produce replacement values rather than general structural patterns. Common standalone built-ins include `lowercase`, `uppercase`, `capitalize`, `trim`, `join`, `split`, `length`, `distinct`, `text`, `resolve`, and `log`. Availability and named argument signatures differ by runtime/version; check the target's documentation before using them.

## Direct syntax-tree nodes are runtime-specific

Standalone Grit commonly exposes Tree-sitter-style names:

```grit
call_expression(function = $callee)
```

Biome exposes PascalCase CST names and Biome field names:

```grit
engine biome(1.0)
language js(typescript, jsx)

JsConditionalExpression(consequent = $value)
```

Never translate names mechanically. Inspect the target syntax tree or matching grammar.

## Standalone-only workflow features

Treat `sequential`, `multifile`, `file`, `range`, `$filename`, `$new_files`, JavaScript-implemented functions, and standard-library helper patterns as standalone features unless another runtime explicitly supports and tests them.

Executable Markdown patterns live under `.grit/patterns`. The Markdown filename stem is the pattern name; the fenced `grit` block contains the root query directly. Do not wrap it in `local pattern <same_name>()`, which makes the pattern attempt to define itself.

Run:

```bash
grit --version
grit patterns test --filter=<pattern-name>
grit apply <pattern-name> <narrow-path> --dry-run
```

Markdown sample conventions are version-sensitive. Current documentation says one block must match and two identical blocks are negative, while the Grit 0.1.1 runner interprets a one-block rewrite sample as “must not match” and two identical blocks as expected matched output. Execute a tiny probe under the installed runner before encoding a suite; its behavior is authoritative.

## Official references

- [GritQL language overview](https://docs.grit.io/language/overview)
- [Language tutorial](https://docs.grit.io/tutorials/gritql)
- [Syntax reference](https://docs.grit.io/language/syntax)
- [Patterns](https://docs.grit.io/language/patterns)
- [Conditions](https://docs.grit.io/language/conditions)
- [Pattern modifiers](https://docs.grit.io/language/modifiers)
- [Bubble and scoping](https://docs.grit.io/language/bubble)
- [Functions](https://docs.grit.io/language/functions)
- [Target languages](https://docs.grit.io/language/target-languages)
- [Testing GritQL](https://docs.grit.io/guides/testing)