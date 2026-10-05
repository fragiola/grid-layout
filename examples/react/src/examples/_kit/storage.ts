// Saving a layout in the browser: app policy, never the grid's (D14). Every access is guarded:
// storage may be blocked, full or private.

/** The value saved under `key`, or `undefined`. */
export function load<T>(key: string): T | undefined {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
        return undefined;
    }
}

/** Saves `value` under `key`; says whether it could. */
export function save(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/** Forgets what is saved under `key`. */
export function forget(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // nothing saved, nothing to forget
    }
}
