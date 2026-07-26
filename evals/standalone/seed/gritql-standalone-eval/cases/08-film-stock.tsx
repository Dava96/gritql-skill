type BadgeProps = Record<string, unknown>;

const FilmBadge = (props: BadgeProps) => <span>{String(props.filmStock)}</span>;
const OtherBadge = (props: BadgeProps) => <span>{String(props.filmStock)}</span>;
const defaults = { compact: true };
const selectedStock = 'Kodak Gold 200';

export function FilmShelf() {
    const metadata = { filmStock: selectedStock };
    const filmStock = 'identifier stays put';

    return (
        <section data-film-stock="archive">
            <FilmBadge filmStock="Harman Phoenix" />
            <FilmBadge size="small" filmStock={selectedStock} compact />
            <FilmBadge {...defaults} filmStock={metadata.filmStock} data-film-stock="visible" />
            <OtherBadge filmStock="Ilford HP5" />
            <p>{filmStock}</p>
        </section>
    );
}
