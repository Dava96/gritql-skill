declare const darkroom: any;
declare const otherDarkroom: any;
declare const nextRoll: () => unknown;
declare const settings: { agitation: number };

export async function hiddenRitual() {
    await darkroom.process({ roll: nextRoll(), agitationSeconds: settings.agitation });
    darkroom.load('extra').agitate(2).develop().archive();
    otherDarkroom.load(nextRoll()).agitate(2).develop();
}
