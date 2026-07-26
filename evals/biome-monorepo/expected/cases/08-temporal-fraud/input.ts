const flushTank = () => undefined;
const develop = (roll: string) => roll;

export function scheduleDarkroom(roll: string) {
    queueMicrotask(flushTank);
    queueMicrotask(() => develop(roll));

    setTimeout(flushTank, 1);
    setTimeout(flushTank, Number(0));
    window.setTimeout(flushTank, 0);
    setTimeout(flushTank, 0, 'legacy-extra-argument');
}
