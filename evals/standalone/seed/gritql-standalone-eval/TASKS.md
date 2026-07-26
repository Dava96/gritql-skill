# Standalone GritQL migration evaluation

The Bureau of Unnecessarily Formal Refactors has issued eight migration orders. Implement and execute each order with the **project-pinned standalone Grit CLI**.

## Rules

- Use only the local CLI from this project (`npm exec -- grit ...`). Do not use `npx`, install another release, or substitute Biome's plugin runtime.
- Produce every source change by applying a retained Grit pattern. Do not manually edit target files or use a regex/JavaScript migration script.
- Retain one executable Markdown pattern per case under `.grit/patterns/`. Its valid filename stem is the local pattern name; put the root query directly in the fenced `grit` block rather than redefining that name.
- Every Markdown pattern must contain positive before/after samples and near-miss samples whose semantics you have verified with the installed `grit patterns test` runner.
- Test each pattern, apply it only to its specified case file, replay it from original input, and require a no-change second pass.
- Preserve formatting and all near misses. Do not modify files outside `.grit/patterns`, `cases`, and `REPORT.md`. Remove temporary files and do not commit.
- Leave `REPORT.md` with the exact CLI version, commands, test results, replay evidence, and idempotence evidence.

## 01 — Bare Film Development (easy)

Pattern file: `rename_develop_film.md`
Pattern name: `rename_develop_film`

Rename calls whose callee is the bare identifier `developFilm` to `processFilm`. Preserve zero, one, and multiple arguments. Leave member calls, declarations, strings, and near-miss identifiers untouched.

## 02 — Object.assign Retirement (moderate)

Pattern file: `retire_object_assign.md`
Pattern name: `retire_object_assign`

Rewrite `Object.assign({}, source)` to `{ ...source }` and the two-source form to `{ ...source, ...overrides }`. Only migrate calls with an empty object first argument and exactly one or two source objects. Preserve all excluded cardinalities and mutating targets.

## 03 — Zero-Delay Timeout (moderate)

Pattern file: `replace_zero_timeout.md`
Pattern name: `replace_zero_timeout`

Rewrite exactly two-argument bare `setTimeout(callback, 0)` calls to `queueMicrotask(callback)`. Preserve arbitrary callback expressions. Leave member calls, nonzero or computed delays, and extra arguments untouched.

## 04 — Telemetry Event Objects (hard)

Pattern file: `migrate_telemetry_events.md`
Pattern name: `migrate_telemetry_events`

Rewrite direct `telemetry.track(name)` to `telemetry.emit({ name })` and the exactly two-argument form to `telemetry.emit({ name, payload: payload })`. Preserve arbitrary expressions. Leave optional chains, other receivers, and three-argument calls untouched.

## 05 — Darkroom Fluent Chain (very hard)

Pattern file: `collapse_darkroom_chain.md`
Pattern name: `collapse_darkroom_chain`

Rewrite the exact chain `darkroom.load(roll).agitate(seconds).develop()` to `darkroom.process({ roll, agitationSeconds: seconds })`. Preserve arbitrary bound expressions and awaited contexts. Leave other receivers, missing/reordered steps, and extra chain steps untouched.

## 06 — Python Request Chaperone (moderate)

Pattern file: `chaperone_python_requests.md`
Pattern name: `chaperone_python_requests`

In Python, rename direct `requests.get(...)` calls to `http.get(...)`, preserving positional and keyword arguments. Leave other receivers, other methods, and strings untouched.

## 07 — Nested JSON Emulsion Keys (hard)

Pattern file: `rename_json_emulsion.md`
Pattern name: `rename_json_emulsion`

In JSON, rename member keys exactly equal to `film_stock` to `emulsion` at every nesting depth, including objects in arrays. Preserve values and near-miss keys exactly.

## 08 — FilmBadge JSX Attribute (very hard)

Pattern file: `rename_film_badge_stock.md`
Pattern name: `rename_film_badge_stock`

Rename the JSX attribute `filmStock` to `emulsion`, but only on `FilmBadge` elements. Preserve attribute order, values, spreads, multiline layout, and boolean attributes. Leave other components, object properties, `data-film-stock`, and ordinary identifiers untouched.
