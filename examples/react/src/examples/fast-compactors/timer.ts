import type { Compactor } from "@fragiola/grid-layout-react";

/** How long the last compaction took, in milliseconds, and who wants to know. */
export interface CompactionTimer {
    /** `compactor`, timed: the same rules, each `compact` call measured */
    readonly time: (compactor: Compactor) => Compactor;
    readonly subscribe: (listener: () => void) => () => void;
    readonly last: () => number | undefined;
}

// A compactor is a plain object, so a wrapper can time it: `performance.now()` around `compact`.
// A compaction can run while React renders the grid (its first layout), so the listeners hear of
// it a moment later, never during that render.
export function createCompactionTimer(): CompactionTimer {
    let last: number | undefined;
    let pending = false;
    const listeners = new Set<() => void>();
    const notify = () => {
        pending = false;
        for (const listener of listeners) listener();
    };
    return {
        time: (compactor) => ({
            ...compactor,
            compact(layout, cols) {
                const start = performance.now();
                const settled = compactor.compact(layout, cols);
                last = performance.now() - start;
                if (!pending) {
                    pending = true;
                    queueMicrotask(notify);
                }
                return settled;
            },
        }),
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        last: () => last,
    };
}
