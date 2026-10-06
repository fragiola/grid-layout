// Ported from React Grid Layout (react-grid-layout, test/spec/wrapCompactor-test.ts), Copyright (c)
// 2016 Samuel Reed, under the MIT licence (see the root LICENSE); its cases come from PR #1773 by
// John Thomson. Items carry `id` (React Grid Layout's `i`); what differs on purpose is marked
// `deviation`.

import { describe, expect, test } from "vitest";
import { wrapCompactor, wrapOverlapCompactor } from "../../src/compactors";
import { overlaps } from "../../src/layout/collision";
import { moveItem } from "../../src/layout/edit";
import type { Layout } from "../../src/layout/types";
import { boxes, frozen, get } from "../layout/helpers";
import { places, randomLayout, unitLayout, withStatics } from "./layouts";

/** Whether every item of `layout` covers cells no other item covers. */
function sharesNoCell(layout: Layout): boolean {
    const cells = new Set<string>();
    for (const item of layout) {
        for (let y = item.y; y < item.y + item.h; y++) {
            for (let x = item.x; x < item.x + item.w; x++) {
                const cell = `${x},${y}`;
                if (cells.has(cell)) return false;
                cells.add(cell);
            }
        }
    }
    return true;
}

describe("wrapCompactor", () => {
    describe("basic properties", () => {
        test("its moves resolve horizontally", () => {
            // deviation: React Grid Layout names the type "wrap", which its moveElement did not
            // know (react-grid-layout#2252); ours is "horizontal", how a move pushes
            expect(wrapCompactor.type).toBe("horizontal");
        });

        test("is not an overlap compactor", () => {
            // React Grid Layout's `allowOverlap: false` is our absent `overlap`
            expect(wrapCompactor.overlap).toBeUndefined();
        });
    });

    describe("compact", () => {
        test("handles an empty layout", () => {
            const layout = frozen([]);
            expect(wrapCompactor.compact(layout, 12)).toHaveLength(0);
        });

        test("handles a single item", () => {
            const layout = frozen([{ id: "a", x: 5, y: 3, w: 1, h: 1 }]);
            expect(boxes(wrapCompactor.compact(layout, 6))).toEqual({
                a: [0, 0, 1, 1],
            });
        });

        test("compacts items in reading order (start to end, top to bottom)", () => {
            const layout = frozen([
                { id: "a", x: 3, y: 2, w: 1, h: 1 },
                { id: "b", x: 0, y: 1, w: 1, h: 1 },
                { id: "c", x: 2, y: 0, w: 1, h: 1 },
            ]);
            // c comes first in reading order (row 0), then b (row 1), then a (row 2)
            expect(places(wrapCompactor.compact(layout, 6))).toEqual({
                c: [0, 0],
                b: [1, 0],
                a: [2, 0],
            });
        });

        test("wraps to the next row past the last column", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 1, h: 1 },
                { id: "b", x: 1, y: 0, w: 1, h: 1 },
                { id: "c", x: 0, y: 1, w: 1, h: 1 },
                { id: "d", x: 1, y: 1, w: 1, h: 1 },
            ]);
            expect(places(wrapCompactor.compact(layout, 2))).toEqual({
                a: [0, 0],
                b: [1, 0],
                c: [0, 1],
                d: [1, 1],
            });
        });

        test("flows around static items", () => {
            const layout = frozen([
                { id: "static", x: 1, y: 0, w: 1, h: 1, static: true },
                { id: "a", x: 0, y: 0, w: 1, h: 1 },
                { id: "b", x: 2, y: 0, w: 1, h: 1 },
            ]);
            const compacted = wrapCompactor.compact(layout, 4);
            // a takes 0, skips the static at 1, b takes 2
            expect(places(compacted)).toEqual({
                static: [1, 0],
                a: [0, 0],
                b: [2, 0],
            });
            expect(get(compacted, "static")).toBe(get(layout, "static"));
        });

        test("keeps the layout's order", () => {
            const layout = frozen([
                { id: "b", x: 1, y: 0, w: 1, h: 1 },
                { id: "a", x: 0, y: 0, w: 1, h: 1 },
            ]);
            const compacted = wrapCompactor.compact(layout, 6);
            expect(compacted.map((item) => item.id)).toEqual(["b", "a"]);
        });

        test("wraps an item that does not fit what is left of a row", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 1 },
                { id: "b", x: 2, y: 0, w: 2, h: 1 },
            ]);
            expect(places(wrapCompactor.compact(layout, 3))).toEqual({
                a: [0, 0],
                b: [0, 1],
            });
        });

        test("never puts an item on a taller item before it", () => {
            // deviation: React Grid Layout puts d on the next cell in reading order, (0, 1),
            // over the second row of a; ours takes the first cells free for d's whole box
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 1, h: 2 },
                { id: "b", x: 1, y: 0, w: 1, h: 1 },
                { id: "c", x: 2, y: 0, w: 1, h: 1 },
                { id: "d", x: 0, y: 2, w: 1, h: 1 },
            ]);
            const compacted = wrapCompactor.compact(layout, 3);
            expect(places(compacted)).toEqual({
                a: [0, 0],
                b: [1, 0],
                c: [2, 0],
                d: [1, 1],
            });
            expect(overlaps(compacted)).toBe(false);
        });

        test("never overlaps a static item taller or wider than one cell", () => {
            // deviation: React Grid Layout only skips the static's cells at the next position,
            // so a wide item starting just before a static runs into it
            const layout = frozen([
                { id: "static", x: 1, y: 0, w: 2, h: 2, static: true },
                { id: "a", x: 0, y: 0, w: 2, h: 1 },
            ]);
            const compacted = wrapCompactor.compact(layout, 4);
            expect(places(compacted)).toEqual({ static: [1, 0], a: [0, 2] });
            expect(overlaps(compacted)).toBe(false);
        });

        test("never overlaps on seeded random layouts with items larger than one cell", () => {
            for (let seed = 1; seed <= 50; seed++) {
                const cols = 3 + (seed % 10);
                const layout = withStatics(
                    randomLayout(30, cols, seed),
                    seed % 4,
                );
                const compacted = wrapCompactor.compact(layout, cols);
                expect(overlaps(compacted), `seed ${seed}`).toBe(false);
                for (const item of compacted) {
                    expect(item.x + item.w).toBeLessThanOrEqual(cols);
                }
            }
        });

        test("packs 1 × 1 items into the first cells, in reading order", () => {
            const layout = unitLayout(100, 12, 7);
            const compacted = wrapCompactor.compact(layout, 12);
            const order = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
            order.forEach((item, index) => {
                expect(get(compacted, item.id)).toMatchObject({
                    x: index % 12,
                    y: Math.floor(index / 12),
                });
            });
        });

        test("is idempotent", () => {
            const layout = randomLayout(40, 8, 3);
            const once = wrapCompactor.compact(layout, 8);
            expect(wrapCompactor.compact(once, 8)).toEqual(once);
        });
    });
});

describe("wrapOverlapCompactor", () => {
    test("its moves resolve horizontally", () => {
        // deviation: "wrap" in React Grid Layout, as for wrapCompactor
        expect(wrapOverlapCompactor.type).toBe("horizontal");
    });

    test("is an overlap compactor", () => {
        expect(wrapOverlapCompactor.overlap).toBe(true);
    });

    test("leaves every item where it is", () => {
        const layout = frozen([
            { id: "a", x: 5, y: 3, w: 1, h: 1 },
            { id: "b", x: 2, y: 1, w: 1, h: 1 },
        ]);
        // deviation: React Grid Layout returns a clone; ours, the same layout (nothing moved)
        expect(wrapOverlapCompactor.compact(layout, 6)).toBe(layout);
    });
});

describe("Compactor interface compliance", () => {
    test("has a type and a compact function", () => {
        expect(wrapCompactor).toHaveProperty("type");
        expect(typeof wrapCompactor.compact).toBe("function");
    });

    test("compact returns an array", () => {
        expect(Array.isArray(wrapCompactor.compact(frozen([]), 12))).toBe(true);
    });

    test("compact keeps every item", () => {
        const layout = frozen([
            { id: "a", x: 0, y: 0, w: 1, h: 1 },
            { id: "b", x: 1, y: 0, w: 1, h: 1 },
            { id: "c", x: 2, y: 0, w: 1, h: 1 },
        ]);
        expect(wrapCompactor.compact(layout, 12)).toHaveLength(3);
    });

    test("compact keeps the items' other fields", () => {
        const layout = frozen([
            {
                id: "test",
                x: 3,
                y: 2,
                w: 2,
                h: 3,
                minW: 1,
                maxW: 4,
                minH: 1,
                maxH: 6,
            },
        ]);
        expect(wrapCompactor.compact(layout, 12)[0]).toEqual({
            id: "test",
            x: 0,
            y: 0,
            w: 2,
            h: 3,
            minW: 1,
            maxW: 4,
            minH: 1,
            maxH: 6,
        });
    });
});

// A move earlier in wrap order reflows the items like a paragraph: the move resolves its
// collisions horizontally, then the wrap compactor settles.
describe("moveItem in wrap mode", () => {
    const rules = { cols: 2, compactor: wrapCompactor };
    const square = frozen([
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "b", x: 1, y: 0, w: 1, h: 1 },
        { id: "c", x: 0, y: 1, w: 1, h: 1 },
        { id: "d", x: 1, y: 1, w: 1, h: 1 },
    ]);
    const three = frozen([
        { id: "1", x: 0, y: 0, w: 1, h: 1 },
        { id: "2", x: 1, y: 0, w: 1, h: 1 },
        { id: "3", x: 0, y: 1, w: 1, h: 1 },
    ]);

    test("react-grid-layout#2252 leaves no two items on one cell when one is dragged earlier", () => {
        const moved = moveItem(square, "d", 0, 1, rules);
        expect(sharesNoCell(moved)).toBe(true);
        expect(moved).toHaveLength(4);
    });

    test("react-grid-layout#2252 leaves no two items on one cell when one is dropped on another", () => {
        const moved = moveItem(three, "2", 0, 0, rules);
        expect(sharesNoCell(moved)).toBe(true);
        expect(moved).toHaveLength(3);
    });

    // the pushed item is resolved again even when the pusher stays on its column, as React Grid
    // Layout's moveElement does when one axis is left out
    test("react-grid-layout#2252 lands the item dragged earlier where it was dropped", () => {
        const moved = moveItem(square, "d", 0, 1, rules);
        expect(get(moved, "d")).toMatchObject({ x: 0, y: 1 });
        expect(get(moved, "c")).toMatchObject({ x: 1, y: 1 });
    });

    test("react-grid-layout#2252 lands the item dropped on another where it was dropped", () => {
        const moved = moveItem(three, "2", 0, 0, rules);
        expect(get(moved, "2")).toMatchObject({ x: 0, y: 0 });
        expect(get(moved, "1")).toMatchObject({ x: 1, y: 0 });
    });
});
