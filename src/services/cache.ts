/**
 * Tiny module-level key/value cache with a TTL per entry.
 * Lives for the lifetime of the browser tab — cleared on page refresh
 * or sign-out (call cache.clear() there). No dependencies.
 *
 * Usage:
 *   const data = await cache.get("my-key", () => fetchFromSupabase(), 60_000);
 *
 * The third arg is TTL in milliseconds (default 2 minutes).
 * Mutations should call cache.invalidate("my-key") so the next read
 * re-fetches.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes

async function get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = DEFAULT_TTL
): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
        return hit.value as T;
    }
    const value = await fetcher();
    store.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
}

function invalidate(...keys: string[]) {
    for (const key of keys) store.delete(key);
}

function invalidatePrefix(prefix: string) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}

function clear() {
    store.clear();
}

export const cache = { get, invalidate, invalidatePrefix, clear };