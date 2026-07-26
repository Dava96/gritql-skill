type Chain = {
    load: (roll: unknown) => Chain;
    agitate: (seconds: unknown) => Chain;
    rinse: () => Chain;
    develop: () => Promise<unknown>;
    process: (input: Record<string, unknown>) => Promise<unknown>;
};

declare const darkroom: Chain;
declare const otherDarkroom: Chain;
declare const roll: unknown;
declare const seconds: number;
declare function selectRoll(): unknown;

export async function performRitual() {
    const standard = darkroom.process({ roll: roll, agitationSeconds: seconds });
    const computed = await darkroom.process({ roll: selectRoll(), agitationSeconds: 30 });

    const otherReceiver = otherDarkroom.load(roll).agitate(seconds).develop();
    const extraStep = darkroom.load(roll).agitate(seconds).rinse().develop();
    const missingStep = darkroom.load(roll).develop();

    return { standard, computed, otherReceiver, extraStep, missingStep };
}
