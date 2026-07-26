declare const FilmBadge: any;
declare const OtherBadge: any;
declare const defaults: Record<string, unknown>;
declare const extras: Record<string, unknown>;
declare const computeStock: () => string;

export const hiddenBadges = (
    <>
        <FilmBadge tone="warm" filmStock={computeStock()} aria-label="hidden" />
        <FilmBadge filmStock />
        <FilmBadge {...defaults} priority={1} filmStock="Kentmere" {...extras} />
        <OtherBadge filmStock="unchanged" />
    </>
);
