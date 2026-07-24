# Troubleshooting GritQL

Diagnose the failure stage before changing syntax. “It does not work” may mean shell corruption, GritQL parse failure, compile/runtime incompatibility, zero matches, false matches, or an incorrect rewrite.

## 1. Confirm what actually ran

Record:

```bash
biome --version
biome --help
grit --version
grit apply --help
```

Use the project-local executable and package manager where applicable. Check the working directory and the configuration file selected by the command. A globally installed CLI can make a valid project pattern appear broken—or accept syntax the project release cannot execute.

## 2. Eliminate shell quoting problems

Backticks are shell syntax. Wrap inline GritQL in single quotes in Bash-like shells:

```bash
biome search '`console.log($message)`' src

grit apply '`console.log($message)` => `console.info($message)`' src --dry-run
```

PowerShell also treats backticks specially. Prefer a `.grit` file, a literal here-string, or an argument API that bypasses shell parsing. When spawning a process with an argument array, pass the query as one raw argument without adding shell quote characters.

If the parser reports a strange error around a snippet that is valid in a file, suspect the shell first.

## 3. Reduce to the smallest valid query

Replace the pattern temporarily with a trivial snippet in the correct language:

```grit
language js(typescript, jsx)

`console.log($message)`
```

Then reintroduce, one at a time:

1. language flavor;
2. metavariables;
3. `where`;
4. each condition;
5. direct node patterns;
6. diagnostics;
7. rewrites.

Execute after every step. This identifies the unsupported or malformed construct instead of prompting broad speculative rewrites.

## 4. Parse and structure errors

Check these common causes:

- Missing comma between entries in `{ ... }`.
- Multiple bare top-level queries. Combine them with `or` or define helpers and invoke one root query.
- A `pattern`, `predicate`, or function definition nested where only top-level definitions are allowed.
- Invalid metavariable name; named variables begin with `$` followed by a letter/underscore and alphanumerics/underscores.
- `$` or a backtick intended as literal target-language text but not escaped.
- `sequential` nested inside another pattern; standalone Grit supports it only at top level.
- A standalone-only feature used in Biome.
- `register_diagnostic()` used in `biome search` or standalone Grit rather than a Biome analyzer plugin.
- A rewrite passed to `biome search`, which currently supports searches only.
- Wrong engine/version directive.

Run a formatter/parser supplied by the same runtime if available; acceptance by an editor grammar alone is not sufficient.

## 5. Query parses but matches nothing

Check:

### Language and flavor

- JSX requires a JSX-capable declaration.
- TypeScript-only syntax needs the TypeScript flavor.
- Biome supports only its documented target languages.
- File extension and `--stdin-file-path` must tell the runner the correct target language.

### Pattern cardinality

- A named metavariable generally binds one structural value, but that value may be a complete list field (for example, a call's arguments) depending on snippet position and runtime.
- `$...` explicitly permits zero or more list elements without naming the binding.
- `$first, $...` requires one or more and binds the first element.
- A repeated named variable requires the same binding each time.

Never infer call cardinality from the metavariable spelling alone. Test zero-, one-, and multiple-argument fixtures with the target runtime.

### Structural shape

A snippet must be valid target-language syntax in the context in which Grit parses it. If a fragment such as an object member, JSX attribute, CSS declaration, or JSON member does not parse or match as a standalone snippet, either provide a larger syntactic container or use a verified direct node.

### Scope

Metavariables unify inside their scope. A descendant traversal may match only the first occurrence if later occurrences bind a different value. Use `bubble` for independent bindings where the runtime supports it.

### Overconstraint

Remove `where` conditions one at a time. Use a search-only query or standalone `log(...)` debugging to inspect what each metavariable actually binds.

## 6. Query matches too much

Add structural constraints, not textual guesses:

- constrain callee/object shape;
- use `within` for required ancestors;
- use `$program <: contains ...` for file-level evidence;
- exclude generated/test paths in runner configuration rather than encoding every path in syntax;
- add `not` conditions for known safe forms;
- use direct nodes only after inspecting the syntax tree.

Remember that a syntactic construction such as `$instance = new TargetClient(...)` is not full type analysis. Aliases, reassignment, parameters, and imports can violate the assumption. Classify these exceptions.

## 7. Direct node pattern fails

The most common cause is using the wrong grammar's name or field.

- Biome CST: PascalCase names such as `JsConditionalExpression` and Biome-native field names.
- Standalone Grit/Tree-sitter: commonly lowercase names such as `call_expression` with Tree-sitter fields.

Discover the exact node and fields from the target version's syntax tree or grammar. Start with `NodeName()` before adding fields. Add one field at a time and execute after each addition.

Do not translate names mechanically (`call_expression` → `CallExpression`); naming and tree shape can differ fundamentally.

## 8. Biome plugin emits no diagnostic

Verify:

1. `biome.json`/`biome.jsonc` actually lists the plugin.
2. The path is correct relative to the selected config.
3. `plugins[].includes` includes the fixture and no negated glob excludes it.
4. The linter is enabled and the command runs plugins (check `--only`/`--skip`).
5. The pattern's matched arm executes `register_diagnostic()`.
6. `span` is bound for every relevant arm.
7. A `lint/plugin` suppression is not active.
8. Diagnostic output is not hidden by diagnostic-level or max-diagnostics settings.

Use a distinctive temporary message to prove which plugin version loaded.

## 9. Biome fix is suggested but not applied

- Safe fixes require `fix_kind = "safe"` and `--write`.
- Rewrites without `fix_kind` are unsafe by default.
- Unsafe fixes require `--write --unsafe`.
- Invalid `fix_kind` or `severity` values cause plugin errors.
- The diagnostic and rewrite must occur in the same successful match path.

Apply the fix to a copied fixture, not the only source file, while debugging.

## 10. Rewrite output is malformed or loses content

- Bind and rewrite the smallest node that must change.
- Preserve all needed metavariables on the right-hand side.
- Test comments attached before, inside, and after the target.
- Test operator precedence and parentheses.
- Test empty and multi-element lists.
- Avoid `raw` output unless intentionally bypassing syntax-aware construction.
- Separate import changes from call-site changes until each works independently.
- Run the target language formatter and parser immediately after rewriting.

If the first rewrite changes the structure so that the same rule rewrites again, add an already-migrated negative fixture and make the rule idempotent.

## 11. Standalone pattern passes examples but fails on the repository

The fixture corpus is incomplete. Sample and classify real matches, then add regression cases for:

- aliases and shadowed names;
- same method on unrelated types;
- nested callbacks/functions;
- different import styles;
- comments and unusual formatting;
- generated/vendor/test files;
- parse errors and unsupported extensions;
- multiple matches sharing scope;
- files that contain both old and new APIs.

Never solve this by applying with `--force` and hoping project tests catch everything.
