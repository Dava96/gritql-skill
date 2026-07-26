const apiFetch = (...args: unknown[]) => Promise.resolve(args);
const client = { fetch: (...args: unknown[]) => Promise.resolve(args) };
const prefetch = (...args: unknown[]) => Promise.resolve(args);

export async function loadFilm(url: string) {
    const zero = apiFetch();
    const one = await apiFetch(url);
    const many = await apiFetch(url, { headers: { Accept: 'application/json' } });
    const browser = window.fetch(url);
    const clientResult = client.fetch(url);
    const prefetched = prefetch(url);
    const label = 'fetch(url)';

    return { zero, one, many, browser, clientResult, prefetched, label, apiFetch };
}
