# Biome plugin fixture

This example reports `console.log()` and offers a safe `console.info()` rewrite.

From this directory, using the target project's Biome binary:

```bash
biome lint invalid.js
biome lint valid.js
cp invalid.js actual.js
biome lint --write actual.js
diff --strip-trailing-cr actual.js valid.js
```

Use the package-manager launcher appropriate to the project. The repository smoke test copies this fixture to a temporary directory before applying the fix, so the checked-in input remains unchanged.
