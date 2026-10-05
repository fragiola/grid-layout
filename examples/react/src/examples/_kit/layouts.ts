// Layouts for the demos: plain objects the grid takes as they are (the same shape as a layout
// item), so the kit needs nothing from the package. App data, no grid and no styles.

/** An item of a demo layout. */
export interface Box {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly minW?: number;
    readonly maxW?: number;
    readonly minH?: number;
    readonly maxH?: number;
    readonly static?: boolean;
}

/** A dashboard of six widgets on 12 columns. */
export function dashboard(): Box[] {
    return [
        { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
        { id: "orders", x: 4, y: 0, w: 4, h: 2 },
        { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
        { id: "conversion", x: 0, y: 2, w: 3, h: 2 },
        { id: "latency", x: 3, y: 2, w: 5, h: 2 },
        { id: "uptime", x: 8, y: 2, w: 4, h: 2 },
    ];
}

/** A deterministic random number generator: the same seed, the same layout. */
export function seeded(seed: number): () => number {
    let value = seed % 2147483647 || 1;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

/** `count` items of random sizes over `cols` columns, from `ids` (cycled with a suffix). */
export function scattered(
    ids: readonly string[],
    count: number,
    cols: number,
    seed = 7,
): Box[] {
    const random = seeded(seed);
    return Array.from({ length: count }, (_, index) => {
        const w = 2 + Math.floor(random() * 3);
        const base = ids[index % ids.length] ?? "item";
        return {
            id:
                index < ids.length
                    ? base
                    : `${base}-${Math.floor(index / ids.length)}`,
            x: Math.floor(random() * (cols - w + 1)),
            y: Math.floor(random() * count),
            w,
            h: 1 + Math.floor(random() * 2),
        };
    });
}

/** A layout no grid would accept as it is: overlaps, an item past the last column, one left of
 * the first, one with no row (`y: Infinity`, "below everything"). */
export function messy(): Box[] {
    return [
        { id: "revenue", x: 0, y: 0, w: 6, h: 2 },
        { id: "orders", x: 3, y: 1, w: 6, h: 2 },
        { id: "visitors", x: 10, y: 0, w: 5, h: 2 },
        { id: "conversion", x: -2, y: 4, w: 4, h: 2 },
        { id: "latency", x: 2, y: 2, w: 6, h: 1 },
        { id: "uptime", x: 0, y: Number.POSITIVE_INFINITY, w: 12, h: 1 },
    ];
}
