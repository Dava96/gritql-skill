---
tags: [migration, api]
---

# Rename a deprecated client method

Replace direct calls to a known client object's deprecated one-argument method.

```grit
language js

`client.oldMethod($value)` => `client.newMethod($value)`
```

## Rewrites a direct call

```typescript
const result = client.oldMethod(value);
```

```typescript
const result = client.newMethod(value);
```

## Preserves the argument expression

```typescript
client.oldMethod(createValue());
```

```typescript
client.newMethod(createValue());
```

## Leaves another object untouched

```typescript
unrelated.oldMethod(value);
```

## Leaves already migrated code untouched

```typescript
client.newMethod(value);
```
