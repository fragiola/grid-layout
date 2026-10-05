import { test } from "vitest";
import {
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "../../src/layout/compact";
import { moveItem } from "../../src/layout/edit";
import type { Layout, LayoutItem } from "../../src/layout/types";

// How long settling takes as layouts grow: a dashboard has tens of items, a stress test a
// thousand. Informative (`pnpm bench`), not a gate.

/** `count` items of random sizes scattered over `cols` columns, deterministic. */
function scattered(count: number, cols: number): Layout {
    let seed = 42;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const items: LayoutItem[] = [];
    for (let i = 0; i < count; i++) {
        const w = 1 + Math.floor(random() * 3);
        items.push({
            id: String(i),
            x: Math.floor(random() * (cols - w + 1)),
            y: Math.floor(random() * count),
            w,
            h: 1 + Math.floor(random() * 3),
        });
    }
    return items;
}

for (const count of [100, 1000]) {
    const layout = scattered(count, 12);
    const settled = verticalCompactor.compact(layout, 12);
    test(`${count} items`, async ({ bench }) => {
        await bench.compare(
            bench("vertical compaction", () => {
                verticalCompactor.compact(layout, 12);
            }),
            bench("horizontal compaction", () => {
                horizontalCompactor.compact(layout, 12);
            }),
            bench("no compaction (overlaps pushed down)", () => {
                noCompactor.compact(layout, 12);
            }),
            bench("one move with push, then settle", () => {
                moveItem(settled, "0", 6, 2, { cols: 12 });
            }),
        );
    });
}
