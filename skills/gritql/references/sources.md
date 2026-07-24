# Sources and provenance

This is an **unofficial community skill**. It is not affiliated with or endorsed by Biome, GritQL, Grit.io, Honeycomb, or their maintainers.

The guidance is curated rather than a mirror of upstream documentation. Short examples were adapted from official docs and tests, then organized around agent workflows. Follow upstream licenses and attribution requirements if expanding this repository with substantial copied material.

## Snapshot reviewed

Last reviewed: **2026-07-24**

| Upstream | Commit reviewed | Primary material |
|---|---|---|
| Biome | [`c50a8538f08795c4ffa3db03ad77945020e9920a`](https://github.com/biomejs/biome/commit/c50a8538f08795c4ffa3db03ad77945020e9920a) | Grit parser/pattern tests, plugin CLI tests, bundled plugin examples |
| Biome website | [`ffea2ef327d71b6435802c1b17aa025eab9a1c83`](https://github.com/biomejs/website/commit/ffea2ef327d71b6435802c1b17aa025eab9a1c83) | GritQL reference, linter plugins, plugin recipes, CLI/config reference |
| GritQL | [`c80b3026471b229f41b279c3eb0c162dcdacfdb1`](https://github.com/biomejs/gritql/commit/c80b3026471b229f41b279c3eb0c162dcdacfdb1) | Core language docs, CLI docs, parser/runtime fixtures |

A project's installed runtime may be older or newer than these snapshots. Its parser and behavior are authoritative.

## Official documentation

### Biome

- [GritQL reference](https://biomejs.dev/reference/gritql/)
- [Linter plugins](https://biomejs.dev/linter/plugins/)
- [GritQL plugin recipes](https://biomejs.dev/recipes/gritql-plugins/)
- [CLI reference (`biome search`, `lint`, `check`)](https://biomejs.dev/reference/cli/)
- [Configuration reference (`plugins`)](https://biomejs.dev/reference/configuration/)
- [Biome Playground](https://biomejs.dev/playground/)
- [GritQL integration status issue](https://github.com/biomejs/biome/issues/2582)
- [Plugin proposal RFC](https://github.com/biomejs/biome/discussions/1762)
- [Biome repository](https://github.com/biomejs/biome)

### GritQL / standalone Grit

- [GritQL repository](https://github.com/biomejs/gritql)
- [GritQL docs](https://docs.grit.io/)
- [Language overview](https://docs.grit.io/language/overview)
- [Patterns](https://docs.grit.io/language/patterns)
- [Conditions](https://docs.grit.io/language/conditions)
- [Modifiers](https://docs.grit.io/language/modifiers)
- [Functions](https://docs.grit.io/language/functions)
- [Variable scoping and `bubble`](https://docs.grit.io/language/bubble)
- [Target languages](https://docs.grit.io/language/target-languages)
- [Testing patterns](https://docs.grit.io/guides/testing)
- [Grit standard library](https://github.com/getgrit/stdlib)

## How to refresh this skill

1. Record the new upstream commits and release versions.
2. Re-read the Biome GritQL reference, plugin docs, recipes, CLI reference, and integration-status issue.
3. Inspect current Biome plugin and Grit parser tests for behavior not yet documented.
4. Re-read the standalone Grit language pages for changed syntax and target languages.
5. Update capability statements separately for Biome and standalone Grit.
6. Run this repository's tests against the new pinned Biome release.
7. Add a regression fixture for each behavior change.
8. Update the review date and commit links here.

Do not update examples solely because a webpage changed. Execute them against the runtime version claimed by the repository.
