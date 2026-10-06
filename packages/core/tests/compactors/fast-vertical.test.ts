// Ported from React Grid Layout (react-grid-layout, test/spec/fast-compactor-test.js), Copyright (c)
// 2016 Samuel Reed, under the MIT licence (see the root LICENSE). Its random layouts are seeded
// here, and its timing comparisons are benches (fast.bench.ts). Items carry `id` (React Grid
// Layout's `i`); what differs on purpose is marked `deviation`.

import { describe, expect, test } from "vitest";
import {
    fastVerticalCompactor,
    fastVerticalOverlapCompactor,
} from "../../src/compactors";
import { overlaps } from "../../src/layout/collision";
import { verticalCompactor } from "../../src/layout/compact";
import { boxes, frozen, get } from "../layout/helpers";
import {
    gridLayout,
    height,
    messyLayout,
    patternLayout,
    places,
    randomLayout,
    withStatics,
} from "./layouts";

describe("fastVerticalCompactor", () => {
    describe("correctness", () => {
        test("produces no overlaps on seeded random layouts", () => {
            for (let seed = 1; seed <= 50; seed++) {
                const cols = 1 + (seed % 6);
                const count = 2 + (seed % 20);
                const layout = withStatics(
                    randomLayout(count, cols, seed),
                    seed % count,
                );
                const compacted = fastVerticalCompactor.compact(layout, cols);
                expect(overlaps(compacted), `seed ${seed}`).toBe(false);
            }
        });

        test("is idempotent on seeded random layouts", () => {
            for (let seed = 1; seed <= 20; seed++) {
                const layout = withStatics(randomLayout(50, 12, seed), 5);
                const once = fastVerticalCompactor.compact(layout, 12);
                expect(
                    fastVerticalCompactor.compact(once, 12),
                    `seed ${seed}`,
                ).toEqual(once);
            }
        });

        test("does not move static items", () => {
            const layout = frozen([
                { id: "static", x: 5, y: 5, w: 2, h: 2, static: true },
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
                { id: "b", x: 5, y: 0, w: 2, h: 8 },
            ]);
            const compacted = fastVerticalCompactor.compact(layout, 12);
            expect(get(compacted, "static")).toBe(get(layout, "static"));
            expect(overlaps(compacted)).toBe(false);
        });

        test("moves items below a static item in their way", () => {
            const layout = frozen([
                { id: "static", x: 0, y: 0, w: 12, h: 2, static: true },
                { id: "a", x: 0, y: 5, w: 4, h: 2 },
            ]);
            const compacted = fastVerticalCompactor.compact(layout, 12);
            expect(get(compacted, "a").y).toBe(2);
        });

        test("keeps the layout's order", () => {
            // deviation: React Grid Layout's returns the items sorted by row and column
            const layout = frozen([
                { id: "b", x: 0, y: 4, w: 2, h: 2 },
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
            ]);
            const compacted = fastVerticalCompactor.compact(layout, 12);
            expect(compacted.map((item) => item.id)).toEqual(["b", "a"]);
        });
    });

    describe("edge cases", () => {
        test("handles an empty layout", () => {
            expect(fastVerticalCompactor.compact(frozen([]), 12)).toEqual([]);
        });

        test("handles a single item", () => {
            const layout = frozen([{ id: "a", x: 5, y: 10, w: 2, h: 2 }]);
            expect(boxes(fastVerticalCompactor.compact(layout, 12))).toEqual({
                a: [5, 0, 2, 2],
            });
        });

        test("handles a layout of static items only", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 2, static: true },
                { id: "b", x: 4, y: 4, w: 2, h: 2, static: true },
            ]);
            expect(fastVerticalCompactor.compact(layout, 12)).toEqual(layout);
        });

        test("handles an item wider than the grid", () => {
            const layout = frozen([{ id: "a", x: 0, y: 3, w: 15, h: 2 }]);
            expect(boxes(fastVerticalCompactor.compact(layout, 12))).toEqual({
                a: [0, 0, 15, 2],
            });
        });

        test("handles an item past the last column", () => {
            // deviation: React Grid Layout's rises to minus infinity (no column to measure a gap
            // in); ours stays on its row
            const layout = frozen([{ id: "a", x: 15, y: 4, w: 2, h: 2 }]);
            const compacted = fastVerticalCompactor.compact(layout, 12);
            expect(compacted).toHaveLength(1);
            expect(compacted[0]).toBe(layout[0]);
        });
    });

    describe("correctness vs the standard compactor", () => {
        test("matches it on a packed grid layout", () => {
            const layout = gridLayout(20, 12);
            expect(places(fastVerticalCompactor.compact(layout, 12))).toEqual(
                places(verticalCompactor.compact(layout, 12)),
            );
        });

        test("matches it on a layout with gaps", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
                { id: "b", x: 4, y: 5, w: 2, h: 2 },
                { id: "c", x: 8, y: 10, w: 2, h: 2 },
            ]);
            expect(places(fastVerticalCompactor.compact(layout, 12))).toEqual(
                places(verticalCompactor.compact(layout, 12)),
            );
        });

        test("matches it with a single static item", () => {
            const layout = frozen([
                { id: "static", x: 0, y: 2, w: 12, h: 2, static: true },
                { id: "a", x: 0, y: 0, w: 4, h: 1 },
                { id: "b", x: 4, y: 0, w: 4, h: 1 },
                { id: "c", x: 0, y: 10, w: 4, h: 2 },
            ]);
            expect(places(fastVerticalCompactor.compact(layout, 12))).toEqual(
                places(verticalCompactor.compact(layout, 12)),
            );
        });

        test("gives a valid layout where it differs, on seeded messy layouts", () => {
            for (let seed = 1; seed <= 20; seed++) {
                const layout = messyLayout(50, 12, seed);
                const standard = verticalCompactor.compact(layout, 12);
                const fast = fastVerticalCompactor.compact(layout, 12);
                expect(overlaps(standard), `seed ${seed}`).toBe(false);
                expect(overlaps(fast), `seed ${seed}`).toBe(false);
                expect(fast).toHaveLength(standard.length);
            }
        });

        test("is rarely taller than it, on seeded messy layouts", () => {
            let standardBetter = 0;
            for (let seed = 1; seed <= 50; seed++) {
                const layout = messyLayout(30, 12, seed);
                const standard = height(verticalCompactor.compact(layout, 12));
                const fast = height(fastVerticalCompactor.compact(layout, 12));
                if (standard < fast) standardBetter++;
            }
            expect(standardBetter).toBeLessThan(40);
        });

        test("keeps static items where it does with several statics", () => {
            const layout = frozen([
                { id: "s1", x: 0, y: 0, w: 4, h: 2, static: true },
                { id: "s2", x: 6, y: 3, w: 4, h: 2, static: true },
                { id: "s3", x: 2, y: 8, w: 6, h: 1, static: true },
                { id: "a", x: 0, y: 5, w: 2, h: 2 },
                { id: "b", x: 4, y: 1, w: 2, h: 2 },
                { id: "c", x: 10, y: 0, w: 2, h: 3 },
                { id: "d", x: 0, y: 10, w: 3, h: 2 },
            ]);
            const standard = verticalCompactor.compact(layout, 12);
            const fast = fastVerticalCompactor.compact(layout, 12);
            for (const id of ["s1", "s2", "s3"]) {
                expect(get(fast, id)).toBe(get(layout, id));
                expect(get(standard, id)).toBe(get(layout, id));
            }
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
        });

        test("keeps every item's id, size and static flag", () => {
            const layout = withStatics(randomLayout(30, 12, 9), 5);
            const compacted = fastVerticalCompactor.compact(layout, 12);
            layout.forEach((original, index) => {
                expect(compacted[index]).toMatchObject({
                    id: original.id,
                    w: original.w,
                    h: original.h,
                });
                expect(compacted[index]?.static).toBe(original.static);
            });
        });

        test("is within 20% of its height on the benchmark's patterned layout", () => {
            const layout = patternLayout(100);
            const standard = verticalCompactor.compact(layout, 12);
            const fast = fastVerticalCompactor.compact(layout, 12);
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
            const difference =
                Math.abs(height(standard) - height(fast)) /
                Math.max(height(standard), 1);
            expect(difference).toBeLessThan(0.2);
        });

        test("stacks items that start on the same cell", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 6, h: 2 },
                { id: "b", x: 0, y: 0, w: 6, h: 2 },
                { id: "c", x: 0, y: 0, w: 6, h: 2 },
            ]);
            const standard = verticalCompactor.compact(layout, 12);
            const fast = fastVerticalCompactor.compact(layout, 12);
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
            expect(height(standard)).toBe(6);
            expect(height(fast)).toBe(6);
        });

        test("handles narrow grids (1 to 3 columns)", () => {
            const layout = frozen(
                Array.from({ length: 10 }, (_, i) => ({
                    id: String(i),
                    x: 0,
                    y: i * 2,
                    w: 1,
                    h: 1 + (i % 2),
                })),
            );
            for (let cols = 1; cols <= 3; cols++) {
                expect(overlaps(verticalCompactor.compact(layout, cols))).toBe(
                    false,
                );
                expect(
                    overlaps(fastVerticalCompactor.compact(layout, cols)),
                ).toBe(false);
            }
        });
    });
});

describe("fastVerticalOverlapCompactor", () => {
    test("is an overlap compactor that resolves moves vertically", () => {
        expect(fastVerticalOverlapCompactor.overlap).toBe(true);
        expect(fastVerticalOverlapCompactor.type).toBe("vertical");
    });

    test("closes gaps without separating items that overlap", () => {
        const layout = frozen([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
            { id: "b", x: 0, y: 1, w: 2, h: 2 },
            { id: "c", x: 4, y: 5, w: 2, h: 2 },
        ]);
        const compacted = fastVerticalOverlapCompactor.compact(layout, 12);
        expect(places(compacted)).toEqual({ a: [0, 0], b: [0, 1], c: [4, 0] });
        expect(compacted[1]).toBe(layout[1]);
    });

    test("rises each item to the tide, so overlapping items may end apart", () => {
        // as React Grid Layout's: a rises 2 rows to the top, b only 1, to a's old bottom
        const layout = frozen([
            { id: "a", x: 0, y: 2, w: 2, h: 2 },
            { id: "b", x: 0, y: 3, w: 2, h: 2 },
        ]);
        expect(
            places(fastVerticalOverlapCompactor.compact(layout, 12)),
        ).toEqual({ a: [0, 0], b: [0, 2] });
    });

    test("leaves an item that overlaps a static item where it is", () => {
        const layout = frozen([
            { id: "static", x: 0, y: 1, w: 2, h: 2, static: true },
            { id: "a", x: 0, y: 2, w: 2, h: 2 },
        ]);
        const compacted = fastVerticalOverlapCompactor.compact(layout, 12);
        expect(compacted[1]).toBe(layout[1]);
    });

    test("never moves an item above the first row, on seeded messy layouts", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const layout = messyLayout(20, 12, seed);
            for (const item of fastVerticalOverlapCompactor.compact(
                layout,
                12,
            )) {
                expect(item.y).toBeGreaterThanOrEqual(0);
            }
        }
    });
});
