# GritQL core language

This is a compact authoring reference, not a replacement for runtime validation. Examples use canonical punctuation that is accepted by current Biome/Grit parsers; support for advanced constructs varies.

## Minimal shape

A reusable query should normally declare its language:

```grit
language js(typescript, jsx)

`console.log($message)`
```

Common declarations:

```grit
language js
language js(typescript)
language js(typescript, jsx)
language css
language json
```

Standalone Grit supports more target languages than Biome. See the runtime-specific references before selecting one.

A GritQL program has definitions followed by one top-level query:

```grit
pattern is_debug_call() {
    or { `console.log($...)`, `console.debug($...)` }
}

is_debug_call()
```

To combine independent top-level rules, use `or`, `any`, or (for supported standalone workflows) `sequential` rather than placing multiple bare queries in one file.

## Structural snippets

Backticks contain source-language snippets:

```grit
`console.log("hello")`
```

Matching is structural, so trivia and usually quote style do not need to match exactly.

Use metavariables as holes:

```grit
`console.log($message)`
`console.$method($message)`
`$left && $left()`
```

The last pattern repeats `$left`, so both occurrences must bind to the same syntax.

### Metavariables

| Form | Meaning |
|---|---|
| `$value` | Bind one structural value. Depending on its snippet position, that value may itself be a list field such as a full argument list. |
| `$_` | Match one structural value without retaining a named binding. |
| `$...` | Explicitly match zero or more list elements, such as arguments. Anonymous. |
| `$first, $...` | Require at least one list element and bind its first element. |
| `$program` | Entire current program (predefined by standalone Grit and used by supported runtimes). |
| `$filename` | Current relative path in standalone Grit. |
| `$new_files` | Standalone Grit accumulator for new files. |

Named metavariables must match `$[a-zA-Z_][a-zA-Z0-9_]*`. Prefer lowercase snake case. `$program`, `$filename`, `$new_files`, and `$grit_*` names are reserved.

To disambiguate a variable next to literal text in an output snippet, use brackets:

```grit
`class $name {}` => `class $[name]Controller {}`
```

## Conditions

Attach conditions with `where`:

```grit
`console.$method($message)` as $call where {
    $method <: or { `log`, `debug` },
    $message <: not `"allowed"`
}
```

- `<:` matches the bound value/node on the left against the pattern on the right.
- Conditions separated by commas in a `where` block must all succeed.
- `not PATTERN` negates a pattern.
- `! CONDITION` negates an entire condition where supported.
- `=` assigns a value; it is not the structural match operator.
- `==` compares resolved values in runtimes that support it.

Prefer `<:` for structural constraints:

```grit
$source <: or { `'lodash'`, `'underscore'` }
```

## Pattern composition

```grit
or {
    `eval($code)`,
    `new Function($...)`
}
```

- `and { ... }`: all patterns must match.
- `or { ... }`: first successful arm wins (short-circuiting).
- `any { ... }`: tries all arms; useful when multiple transformations should run.
- `maybe PATTERN`: succeeds even if the inner pattern does not match.

Bind an entire match with `as`:

```grit
`console.log($message)` as $call
```

This is especially useful for a diagnostic span or rewrite target.

## Tree navigation

Search downward with `contains`:

```grit
`function $name($...) { $body }` where {
    $body <: contains `console.log($...)`
}
```

Search ancestors with `within`:

```grit
`console.log($arg)` as $call where {
    $call <: within `if (DEBUG) { $_ }`
}
```

Use `until` to stop a downward traversal:

```grit
`console.$_($content)` where {
    $content <: contains `secret` until `sanitized($_)`
}
```

`before` and `after` constrain or retrieve adjacent nodes. `some` and `every` apply a pattern to elements of a list. These are more runtime-sensitive; test them directly.

## Rewrites

The rewrite operator is `=>`:

```grit
`console.log($message)` => `console.info($message)`
```

Delete a match by rewriting to the empty pattern:

```grit
`debugger` => .
```

A clear form for complex rewrites is to bind the target and rewrite it inside `where`:

```grit
`console.log($message)` as $call where {
    $message <: not `"keep"`,
    $call => `console.info($message)`
}
```

Keep the rewrite target as specific as possible. Rewriting an inner metavariable often preserves surrounding syntax and comments better than replacing a large enclosing snippet.

## Regex

Use `r"..."` for text constraints:

```grit
$value <: r"#[0-9a-fA-F]+"
```

Regex matches the entire node/value, so use `.*` when intentionally matching a substring. Standalone Grit uses Rust regex syntax. Prefer structural snippets over regex when possible.

Capture groups may bind variables in supported runtimes:

```grit
$message <: r"Hello, (.*)"($name)
```

## Direct syntax-tree nodes

Use direct nodes only after inspecting the relevant syntax tree.

Biome uses PascalCase names and named fields:

```grit
engine biome(1.0)
language js(typescript, jsx)

JsConditionalExpression(consequent = $value)
```

Standalone Grit commonly uses Tree-sitter-style lowercase names:

```grit
engine marzano(0.1)
language js

call_expression(function = $callee, arguments = $args)
```

Names and fields are not portable between engines. Never guess them.

## Definitions and scoping

Reusable patterns establish a local scope:

```grit
pattern console_method_to_info($method) {
    `console.$method($message)` => `console.info($message)`
}

console_method_to_info(method = `log`)
```

Metavariables unify within their scope. A `bubble` introduces a fresh scope so repeated descendant matches may bind different values:

```grit
`function $name() { $body }` where {
    $body <: contains bubble($name) {
        `console.log($message)` => `console.info($name, $message)`
    }
}
```

Root patterns are commonly auto-wrapped in a file/contains/bubble scope by the runtime. Explicit `file(...)`, `sequential`, and `multifile` patterns alter that behavior; see [refactors.md](refactors.md).

## Built-ins

Frequently useful standalone built-ins include:

```grit
lowercase(string = $value)
uppercase(string = $value)
capitalize(string = $value)
trim(string = $value, trim_chars = " ")
join(list = $items, separator = ", ")
split(string = $value, separator = "_")
length(target = $items)
distinct(list = $items)
text(target = $node)
log(message = "debug", variable = $node)
```

Built-ins are replacement values or predicates according to their signature; they are not all implemented by every runtime. Consult the target version rather than assuming availability.
