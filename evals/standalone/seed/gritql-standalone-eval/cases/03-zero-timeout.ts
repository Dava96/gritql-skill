const flushTank = () => undefined;
const develop = (roll: string) => roll;

export function scheduleDarkroom(roll: string) {
    setTimeout(flushTank, 0);
    setTimeout(() => develop(roll), 0);

    setTimeout(flushTank, 1);
    setTimeout(flushTank, Number(0));
    window.setTimeout(flushTank, 0);
    setTimeout(flushTank, 0, 'legacy-extra-argument');
}
