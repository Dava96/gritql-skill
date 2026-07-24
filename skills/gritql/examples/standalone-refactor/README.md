# Standalone Grit refactor fixture

This example uses Grit's executable Markdown pattern format. The two identical blocks in each negative case are intentional: Grit interprets them as unchanged before/after output.

With a compatible standalone Grit CLI, run from this directory:

```bash
grit patterns test --filter=rename_client_method
```

This fixture is not exercised by the repository's Biome-only smoke test. Validate it with the standalone version used by the target project before applying it.