declare const darkroom: any;
declare const otherDarkroom: any;
declare const nextRoll: () => unknown;
declare const settings: { agitation: number };

export async function hiddenRitual() {
    await darkroom.load(nextRoll()).agitate(settings.agitation).develop();
    darkroom.load('extra').agitate(2).develop().archive();
    otherDarkroom.load(nextRoll()).agitate(2).develop();
}
