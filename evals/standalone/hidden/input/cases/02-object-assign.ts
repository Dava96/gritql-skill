declare const makeDefaults: () => Record<string, unknown>;
declare const getOverrides: () => Record<string, unknown>;
declare const third: Record<string, unknown>;
declare const target: Record<string, unknown>;

export const clone = Object.assign({}, makeDefaults());
export const merged = Object.assign({}, makeDefaults(), getOverrides());
export const mutating = Object.assign(target, getOverrides());
export const crowded = Object.assign({}, makeDefaults(), getOverrides(), third);
