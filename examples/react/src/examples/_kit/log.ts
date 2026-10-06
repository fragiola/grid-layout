// A log the app keeps beside the grid: newest first, capped. App logic, no grid and no styles.

/** A line of a log: a key for React, and what the app wants to show. */
export interface LogLine<T> {
    readonly key: number;
    readonly entry: T;
}

let made = 0;

/** `log` with `entry` added first, keeping the newest `limit` lines (default 50). */
export function prepend<T>(
    log: readonly LogLine<T>[],
    entry: T,
    limit = 50,
): LogLine<T>[] {
    made += 1;
    return [{ key: made, entry }, ...log].slice(0, limit);
}
