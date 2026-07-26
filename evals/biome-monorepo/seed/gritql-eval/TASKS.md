# GritQL migration stress test

The Society for Needlessly Specific Film Software Standards has issued ten migration orders. Write and **execute** each migration as a Biome GritQL linter plugin against the files under `gritql-eval/cases`.

## Rules

- Produce the source changes by executing Biome GritQL plugins. Do not manually edit the target files or use a JavaScript/regex migration script.
- Retain one plugin per case under `gritql-eval/plugins/`, using the filename specified below, and register the plugins in the repository's existing Biome configuration so they can be rerun.
- Do not modify files outside `gritql-eval`, except for the required plugin configuration. Do not commit.
- Preserve formatting and lexical near misses that are not migration targets; in particular, do not run a formatter that normalises the deliberately uppercase CSS color.
- Leave a brief `gritql-eval/REPORT.md` describing what you ran and how you checked the result.

## 01 — The Verb-First Film Development Accord (easy)

Plugin: `01-verb-first-film.grit`

Rename calls whose callee is the bare identifier `developFilm` to `processFilm`. It must handle zero, one, and multiple arguments. Leave `lab.developFilm(...)`, the `developFilm` function declaration, strings, and other identifiers untouched.

## 02 — The Polite Console Mandate (easy)

Plugin: `02-polite-console.grit`

Rewrite every `console.log(...)` call to `console.info(...)`, including zero, one, and multiple arguments. Leave `console.warn`, `logger.log`, strings, and `console.logLevel` untouched.

## 03 — Object.assign Retires to the Seaside (moderate)

Plugin: `03-object-assign-retirement.grit`

Rewrite `Object.assign({}, source)` to `{ ...source }` and `Object.assign({}, source, overrides)` to `{ ...source, ...overrides }`. Only migrate calls whose first argument is an empty object literal and that have exactly one or two source objects. Leave mutating assignments, zero-source calls, and three-source calls untouched.

## 04 — The Unicorn Magenta Preservation Order (moderate)

Plugin: `04-unicorn-magenta.grit`

In CSS declaration values, replace lowercase color tokens `#ff00ff` with `var(--unicorn-magenta)`, including tokens nested in gradients. Leave uppercase `#FF00FF`, quoted text, comments, selectors, and near-miss colors untouched.

## 05 — The Film Stock Identity Crisis (tricky)

Plugin: `05-film-stock-identity.grit`

Rename the JSX attribute `filmStock` to `emulsion`, but only on `FilmBadge` opening elements. Handle attributes in any position, multiline elements, spread attributes, expression values, and boolean attributes without changing their order. Leave `OtherBadge`, object properties, `data-film-stock`, and ordinary identifiers untouched.

## 06 — The JSON Emulsion Census (tricky)

Plugin: `06-json-emulsion.grit`

In JSON, rename object member keys exactly equal to `film_stock` to `emulsion` at every nesting depth, including objects inside arrays. Do not change values containing the text, or keys such as `film_stock_note` and `preferred_film_stock`.

## 07 — Fetch Must Bring a Chaperone (tricky)

Plugin: `07-fetch-chaperone.grit`

Rename calls whose callee is the bare identifier `fetch` to `apiFetch`, preserving zero, one, and multiple arguments. Leave `window.fetch`, `client.fetch`, `prefetch`, strings, and declarations untouched.

## 08 — Zero-Millisecond Temporal Fraud (hard)

Plugin: `08-temporal-fraud.grit`

Rewrite exactly two-argument `setTimeout(callback, 0)` calls to `queueMicrotask(callback)`. Preserve arbitrary callback expressions. Leave nonzero delays, computed zero values, `window.setTimeout`, and calls with extra arguments untouched.

## 09 — The Telemetry Event Bureaucracy Act (hard)

Plugin: `09-telemetry-bureaucracy.grit`

Migrate direct `telemetry.track(name)` calls to `telemetry.emit({ name })`, and direct `telemetry.track(name, payload)` calls to `telemetry.emit({ name, payload: payload })`. Preserve arbitrary name and payload expressions. Leave optional-chain calls, other receivers, and calls with three arguments untouched.

## 10 — Collapse the Ceremonial Darkroom Ritual (very hard)

Plugin: `10-darkroom-ritual.grit`

Rewrite the exact fluent chain `darkroom.load(roll).agitate(seconds).develop()` to `darkroom.process({ roll, agitationSeconds: seconds })`. Preserve arbitrary expressions bound as `roll` and `seconds`, including calls and awaited contexts. Leave other receivers, missing steps, reordered steps, and chains with extra steps untouched.
