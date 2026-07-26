const apiFetch = (...args: unknown[]) => Promise.resolve(args);
const client = { fetch: (...args: unknown[]) => Promise.resolve(args) };
const prefetch = (...args: unknown[]) => Promise.resolve(args);

export async function loadFilm(url: string) {
    const zero = fetch();
    const one = await fetch(url);
    const many = await fetch(url, { headers: { Accept: 'application/json' } });
    const browser = window.fetch(url);
    const clientResult = client.fetch(url);
    const prefetched = prefetch(url);
    const label = 'fetch(url)';

    return { zero, one, many, browser, clientResult, prefetched, label, apiFetch };
}
