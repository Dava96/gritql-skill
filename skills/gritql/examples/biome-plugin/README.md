# Biome plugin fixture

This plugin reports `console.log()` and offers a deliberately **unsafe** `console.info()` rewrite because changing logging methods can change observable behavior.

The fixtures cover zero, one, and multiple arguments, a valid file, `lint/plugin` suppression, an excluded path, unsafe-write behavior, and idempotence. From this directory, using the target project's Biome binary:

```bash
biome lint invalid.js valid.js suppressed.js excluded.js
cp invalid.js actual.js
biome lint --write actual.js                 # leaves the unsafe fix unapplied
biome lint --write --unsafe actual.js        # applies it
```

The repository smoke test performs writes in a temporary directory.