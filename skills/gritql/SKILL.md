---
name: gritql
description: Author, debug, test, and review GritQL for structural search, deterministic codemods, large refactors, migrations, and Biome analyzer/linter plugins. Use when working with .grit files, Grit patterns, biome search, Biome plugins or register_diagnostic(), or when a repeated code change may be safer and cheaper as a GritQL rewrite than as manual or LLM-authored edits.
license: MIT
compatibility: Requires the target project's Biome CLI for Biome workflows or the Grit CLI for standalone GritQL workflows. The bundled doctor script requires Node.js 18+.
metadata:
  author: David
  version: "0.1.0"
---

# GritQL

This is an unofficial community-authored skill, not upstream Biome or GritQL documentation.

Use GritQL as an executable specification: discover structurally, constrain explicitly, test on positive and negative fixtures, then rewrite. Never claim a query is valid merely because it looks plausible.

## Start here

1. Identify the runtime **before writing syntax**:
   - **Biome plugin**: `.grit` appears in `biome.json`/`biome.jsonc` `plugins`, or the rule calls `register_diagnostic()`.
   - **Biome search**: the task uses `biome search`. Search does not apply rewrites.
   - **Standalone Grit/Marzano**: the project uses `.grit/grit.yaml`, `.grit/patterns`, `grit apply`, or `grit patterns test`.
2. Inspect the project version, configuration, nearby patterns, target files, and available CLI. If useful, run:

   ```bash
   node <skill-directory>/scripts/gritql-doctor.mjs <project-root>
   ```

3. Read the runtime-specific reference:
   - Biome: [references/biome.md](references/biome.md)
   - Standalone refactors: [references/refactors.md](references/refactors.md)
   - Core syntax: [references/language-core.md](references/language-core.md)
   - Errors or non-matches: [references/troubleshooting.md](references/troubleshooting.md)
4. Treat the installed target runtime as authoritative. GritQL support differs by runtime and version. Do not assume standalone Grit acceptance implies Biome compatibility, or vice versa.

## Decide whether GritQL is the right tool

Prefer GritQL when the change is:

- repeated across many files;
- recognizable by syntax rather than raw text;
- expressible as explicit invariants and exclusions;
- deterministic and reviewable as a diff;
- testable with representative before/after fixtures.

Prefer ordinary edits or a language-specific codemod when the change requires deep type information, control/data-flow reasoning unsupported by the runtime, highly contextual product judgment, or many unrelated one-off transformations.

For borderline work, use a hybrid: use the LLM to design and validate one GritQL pattern, let the runtime execute the repetitive change, and reserve manual/LLM edits for classified exceptions.

## Authoring workflow

### 1. State the contract

Write down:

- target runtime and exact version;
- target language/flavor;
- positive examples that must match;
- near-miss negative examples that must not match;
- required rewrite, if any;
- safety constraints and expected scope.

Do not begin with a large rewrite. Begin with the smallest structural search.

### 2. Build a fixture corpus

Include at minimum:

- one simple positive;
- formatting and quote variants;
- multiple matches in one file;
- zero-match and near-miss negatives;
- nested/aliased/optional forms relevant to the task;
- an already-migrated case;
- a case that must remain unchanged.

Use real project excerpts after removing secrets. A pattern proven only against a toy example is not ready for a repository-wide refactor.

### 3. Grow the pattern incrementally

Use this order:

1. snippet pattern with backticks;
2. metavariables for variable parts;
3. `where` and `<:` constraints;
4. `or`, `not`, `contains`, or `within` only as needed;
5. runtime-specific CST/AST nodes only when snippets cannot express the rule;
6. `=>` rewrite last.

After every added constraint, execute the target runtime and inspect both matches and non-matches.

### 4. Validate with the target runner

For Biome plugins, run the project's Biome binary against isolated violating and valid fixtures. For standalone patterns, use Markdown/YAML samples and `grit patterns test`. Follow [references/biome.md](references/biome.md) or [references/refactors.md](references/refactors.md) for commands.

If the required CLI is unavailable, say **“not runtime-validated”**, provide the exact command the user should run, and do not describe the pattern as working.

### 5. Apply safely

Before a repository-wide rewrite:

1. require a clean or intentionally staged Git state;
2. run search/dry-run first;
3. record expected match counts and inspect every match class;
4. apply to a narrow path or fixture;
5. inspect the diff;
6. run formatter, linter, type checker, and tests;
7. widen scope in reviewable batches;
8. rerun the pattern and verify idempotence (no unintended second-pass changes).

Never use `--force`, `--write`, or an unsafe fix across a repository without first showing a dry run or fixture result.

## Review checklist

Before finishing, verify:

- [ ] Runtime/dialect and version are explicit.
- [ ] Language declaration is explicit for reusable patterns.
- [ ] Pattern has one valid top-level query (definitions may precede it).
- [ ] Named metavariables intentionally unify repeated occurrences.
- [ ] `$...` versus a single argument metavariable is intentional.
- [ ] Diagnostic span is the smallest useful bound node.
- [ ] Positive and negative fixtures execute under the target runtime.
- [ ] Rewrites preserve comments, imports, precedence, and formatting where relevant.
- [ ] Biome `severity` and `fix_kind` use supported values.
- [ ] Match count and diff were reviewed before broad application.
- [ ] A second run is empty or intentionally documented.
- [ ] Remaining exceptions are listed rather than silently ignored.

## Non-negotiable rules

- Do not invent CST/AST node or field names. Discover them from the target runtime’s syntax tree/playground or grammar files, then test them.
- Do not mix Biome PascalCase CST names with standalone Tree-sitter-style node names.
- Do not use `register_diagnostic()` outside a Biome plugin workflow.
- Do not assume `biome search` can perform rewrites; it currently searches only.
- Do not use regex as a substitute for structure when a snippet or node pattern exists.
- Do not copy a documentation example without adapting and testing it against the user’s actual syntax and version.

See [references/sources.md](references/sources.md) for official sources and the versions used to curate this skill.
