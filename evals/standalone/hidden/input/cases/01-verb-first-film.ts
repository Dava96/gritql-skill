declare function developFilm(...args: unknown[]): unknown;
declare const lab: { developFilm(...args: unknown[]): unknown };
declare const buildRoll: () => unknown;

export const result = developFilm(buildRoll(), { push: 2 }, 'night');
export const outsourced = lab.developFilm(buildRoll());
