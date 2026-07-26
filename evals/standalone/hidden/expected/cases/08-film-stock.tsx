declare const FilmBadge: any;
declare const OtherBadge: any;
declare const defaults: Record<string, unknown>;
declare const extras: Record<string, unknown>;
declare const computeStock: () => string;

export const hiddenBadges = (
    <>
        <FilmBadge tone="warm" emulsion={computeStock()} aria-label="hidden" />
        <FilmBadge emulsion />
        <FilmBadge {...defaults} priority={1} emulsion="Kentmere" {...extras} />
        <OtherBadge filmStock="unchanged" />
    </>
);
