type Roll = { format: string };

const processFilm = (...instructions: unknown[]) => instructions;
const lab = {
    developFilm: (...instructions: unknown[]) => instructions,
};

export function receiveRolls(roll: Roll) {
    const zero = developFilm();
    const one = developFilm(roll);
    const many = developFilm(roll, 'push+1');
    const outsourced = lab.developFilm(roll);
    const label = 'developFilm';

    return { zero, one, many, outsourced, label };
}

function developFilm(...instructions: unknown[]) {
    return processFilm(...instructions);
}
