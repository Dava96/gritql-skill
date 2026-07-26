# Standalone Grit refactor fixture

This example uses Grit's executable Markdown pattern format as interpreted by the Grit 0.1.1 runner: each one-block negative case must remain unmatched. Markdown sample semantics have differed across releases and documentation, so probe the installed target runner before copying this convention.

With a compatible standalone Grit CLI, run from this directory:

```bash
grit patterns test --filter=rename_client_method
```

This fixture is not exercised by the repository's Biome-only smoke test. Validate it with the standalone version used by the target project before applying it.