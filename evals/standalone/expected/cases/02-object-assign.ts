const defaults = { agitation: 'gentle' };
const overrides = { temperature: 20 };
const provenance = { operator: 'Ada' };
const target = { batch: 'A-12' };

export const clone = { ...defaults };
export const merged = { ...defaults, ...overrides };

export const mutatesTarget = Object.assign(target, overrides);
export const noSources = Object.assign({});
export const tooManySources = Object.assign({}, defaults, overrides, provenance);
export const reference = Object.assign;
