// Shared layouts for the compactor tests and benches: deterministic (a seeded PRNG, so a failure
// replays), deep-frozen (a compactor that mutates its input throws), and in the columns, as a
// committed layout is. Shaped after React Grid Layout's generators (test/spec/fast-compactor-test.js).

import { collides } from "../../src/layout/collision";
import type { Layout, LayoutItem } from "../../src/layout/types";
import { frozen } from "../layout/helpers";

/** A seeded PRNG (mulberry32): the same seed, the same numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** An integer in [0, `below`). */
const int = (random: () => number, below: number) =>
    Math.floor(random() * below);

/** `count` items of 1 to 3 × 1 to 3 cells, scattered over `rows` rows of `cols` columns. */
function scatter(
    count: number,
    cols: number,
    rows: number,
    seed: number,
): LayoutItem[] {
    const random = mulberry32(seed);
    const items: LayoutItem[] = [];
    for (let i = 0; i < count; i++) {
        const w = 1 + int(random, Math.min(3, cols));
        items.push({
            id: String(i),
            x: int(random, cols - w + 1),
            y: int(random, Math.max(rows, 1)),
            w,
            h: 1 + int(random, 3),
        });
    }
    return items;
}

/** `count` items scattered over as many rows: gaps everywhere, some overlaps. */
export function randomLayout(count: number, cols = 12, seed = 1): Layout {
    return frozen(scatter(count, cols, count, seed));
}

/** `count` items scattered over half as many rows: gaps and many overlaps. */
export function messyLayout(count: number, cols = 12, seed = 1): Layout {
    return frozen(scatter(count, cols, Math.floor(count / 2), seed));
}

/** `count` items of 2 × 2, in reading order, packed: already compact. */
export function gridLayout(count: number, cols = 12): Layout {
    const items: LayoutItem[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: String(i),
            x: (i * 2) % cols,
            y: Math.floor((i * 2) / cols) * 2,
            w: 2,
            h: 2,
        });
    }
    return frozen(items);
}

/** React Grid Layout's deterministic benchmark layout: `count` items in a repeating pattern. */
export function patternLayout(count: number): Layout {
    const items: LayoutItem[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: String(i),
            x: (i * 3) % 12,
            y: i % 7,
            w: 1 + (i % 3),
            h: 1 + (i % 2),
        });
    }
    return frozen(items);
}

/** `count` items of 1 × 1 scattered over `cols` columns and as many rows as items. */
export function unitLayout(count: number, cols = 12, seed = 1): Layout {
    const random = mulberry32(seed);
    const items: LayoutItem[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: String(i),
            x: int(random, cols),
            y: int(random, count),
            w: 1,
            h: 1,
        });
    }
    return frozen(items);
}

/**
 * `layout` with its first `count` items static, each moved down until it overlaps no static
 * before it: statics never overlap one another, as in a committed layout.
 */
export function withStatics(layout: Layout, count: number): Layout {
    const statics: LayoutItem[] = [];
    const items = layout.map((item, index) => {
        if (index >= count) return { ...item };
        let fixed: LayoutItem = { ...item, static: true };
        while (statics.some((other) => collides(fixed, other))) {
            fixed = { ...fixed, y: fixed.y + 1 };
        }
        statics.push(fixed);
        return fixed;
    });
    return frozen(items);
}

/** The row just below the lowest item. */
export function height(layout: Layout): number {
    return Math.max(0, ...layout.map((item) => item.y + item.h));
}

/** The column just after the item reaching furthest toward the end. */
export function width(layout: Layout): number {
    return Math.max(0, ...layout.map((item) => item.x + item.w));
}

/** Each item's `[x, y]`, by id: what a compactor decides. */
export function places(layout: Layout): Record<string, [number, number]> {
    return Object.fromEntries(
        layout.map((item) => [item.id, [item.x, item.y]]),
    );
}
