declare function developFilm(...args: unknown[]): unknown;
declare const lab: { developFilm(...args: unknown[]): unknown };
declare const buildRoll: () => unknown;

export const result = processFilm(buildRoll(), { push: 2 }, 'night');
export const outsourced = lab.developFilm(buildRoll());
