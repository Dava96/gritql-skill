---
tags: [migration, api]
---

# Rename a deprecated client method

Replace direct calls to a known client object's deprecated method while preserving its complete argument list.

```grit
language js

`client.oldMethod($arguments)` => `client.newMethod($arguments)`
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

## Preserves zero arguments

```typescript
client.oldMethod();
```

```typescript
client.newMethod();
```

## Preserves multiple arguments

```typescript
client.oldMethod(first, second);
```

```typescript
client.newMethod(first, second);
```

## Leaves another object untouched

```typescript
unrelated.oldMethod(value);
```

## Leaves already migrated code untouched

```typescript
client.newMethod(value);
```
