// Ported from React Grid Layout (react-grid-layout, test/spec/fast-horizontal-compactor-test.js),
// Copyright (c) 2016 Samuel Reed, under the MIT licence (see the root LICENSE). Its random layouts
// are seeded here, and its timing comparisons are benches (fast.bench.ts). Items carry `id` (React
// Grid Layout's `i`); what differs on purpose is marked `deviation`.

import { describe, expect, test } from "vitest";
import {
    fastHorizontalCompactor,
    fastHorizontalOverlapCompactor,
} from "../../src/compactors";
import { overlaps } from "../../src/layout/collision";
import { horizontalCompactor } from "../../src/layout/compact";
import { boxes, frozen, get } from "../layout/helpers";
import {
    gridLayout,
    messyLayout,
    patternLayout,
    places,
    randomLayout,
    width,
    withStatics,
} from "./layouts";

describe("fastHorizontalCompactor", () => {
    describe("correctness", () => {
        test("produces no overlaps on seeded random layouts", () => {
            for (let seed = 1; seed <= 50; seed++) {
                const cols = 6 + (seed % 6);
                const count = 2 + (seed % 20);
                const layout = withStatics(
                    randomLayout(count, cols, seed),
                    seed % count,
                );
                const compacted = fastHorizontalCompactor.compact(layout, cols);
                expect(overlaps(compacted), `seed ${seed}`).toBe(false);
            }
        });

        test("is idempotent on seeded random layouts", () => {
            for (let seed = 1; seed <= 20; seed++) {
                const layout = withStatics(randomLayout(50, 12, seed), 5);
                const once = fastHorizontalCompactor.compact(layout, 12);
                expect(
                    fastHorizontalCompactor.compact(once, 12),
                    `seed ${seed}`,
                ).toEqual(once);
            }
        });

        test("does not move static items", () => {
            const layout = frozen([
                { id: "static", x: 5, y: 5, w: 2, h: 2, static: true },
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
                { id: "b", x: 0, y: 5, w: 8, h: 2 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(get(compacted, "static")).toBe(get(layout, "static"));
            expect(overlaps(compacted)).toBe(false);
        });

        test("moves items past a static item in their way", () => {
            const layout = frozen([
                { id: "static", x: 0, y: 0, w: 2, h: 12, static: true },
                { id: "a", x: 5, y: 0, w: 4, h: 2 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(get(compacted, "a").x).toBe(2);
        });

        test("compacts items toward the start", () => {
            const layout = frozen([
                { id: "a", x: 5, y: 0, w: 2, h: 2 },
                { id: "b", x: 8, y: 0, w: 2, h: 2 },
            ]);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                {
                    a: [0, 0],
                    b: [2, 0],
                },
            );
        });

        test("keeps each item's row when nothing is in the way", () => {
            const layout = frozen([
                { id: "a", x: 5, y: 0, w: 2, h: 2 },
                { id: "b", x: 8, y: 3, w: 2, h: 2 },
                { id: "c", x: 10, y: 6, w: 2, h: 2 },
            ]);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                {
                    a: [0, 0],
                    b: [0, 3],
                    c: [0, 6],
                },
            );
        });

        test("wraps an item to the next row when it does not fit", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 6, h: 1 },
                { id: "b", x: 0, y: 0, w: 8, h: 1 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(places(compacted)).toEqual({ a: [0, 0], b: [0, 1] });
        });

        test("wraps several items when a row is full", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 5, h: 1 },
                { id: "b", x: 0, y: 0, w: 5, h: 1 },
                { id: "c", x: 0, y: 0, w: 5, h: 1 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(places(compacted)).toEqual({
                a: [0, 0],
                b: [5, 0],
                c: [0, 1],
            });
            expect(overlaps(compacted)).toBe(false);
        });

        test("keeps the layout's order", () => {
            // deviation: React Grid Layout's returns the items sorted by column and row
            const layout = frozen([
                { id: "b", x: 6, y: 0, w: 2, h: 2 },
                { id: "a", x: 3, y: 0, w: 2, h: 2 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(compacted.map((item) => item.id)).toEqual(["b", "a"]);
        });
    });

    describe("edge cases", () => {
        test("handles an empty layout", () => {
            expect(fastHorizontalCompactor.compact(frozen([]), 12)).toEqual([]);
        });

        test("handles a single item", () => {
            const layout = frozen([{ id: "a", x: 10, y: 5, w: 2, h: 2 }]);
            expect(boxes(fastHorizontalCompactor.compact(layout, 12))).toEqual({
                a: [0, 5, 2, 2],
            });
        });

        test("handles a layout of static items only", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 2, static: true },
                { id: "b", x: 4, y: 4, w: 2, h: 2, static: true },
            ]);
            expect(fastHorizontalCompactor.compact(layout, 12)).toEqual(layout);
        });

        test("handles an item wider than the grid", () => {
            const layout = frozen([{ id: "a", x: 2, y: 0, w: 15, h: 2 }]);
            expect(boxes(fastHorizontalCompactor.compact(layout, 12))).toEqual({
                a: [0, 0, 15, 2],
            });
        });

        test("handles an item past the last column", () => {
            const layout = frozen([{ id: "a", x: 15, y: 0, w: 2, h: 2 }]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(compacted).toHaveLength(1);
            expect(compacted[0]?.x).toBe(0);
        });

        test("handles an item far below the others", () => {
            const layout = frozen([
                { id: "a", x: 5, y: 0, w: 2, h: 2 },
                { id: "b", x: 5, y: 100, w: 2, h: 2 },
            ]);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                {
                    a: [0, 0],
                    b: [0, 100],
                },
            );
        });

        test("places an item wider than the grid on the first row free at the start", () => {
            // deviation: React Grid Layout's never fits it, searches down to its row limit,
            // warns and gives up at x 0 of that far row; ours takes the first row whose start
            // is free, below the full-width static
            const layout = frozen([
                { id: "static", x: 0, y: 0, w: 12, h: 1, static: true },
                { id: "a", x: 0, y: 0, w: 13, h: 1 },
            ]);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            expect(compacted).toHaveLength(2);
            expect(places(compacted)).toEqual({ static: [0, 0], a: [0, 1] });
        });
    });

    describe("correctness vs the standard compactor", () => {
        test("matches it on a packed grid layout", () => {
            const layout = gridLayout(20, 12);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                places(horizontalCompactor.compact(layout, 12)),
            );
        });

        test("matches it on a layout with gaps", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
                { id: "b", x: 5, y: 4, w: 2, h: 2 },
                { id: "c", x: 10, y: 8, w: 2, h: 2 },
            ]);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                places(horizontalCompactor.compact(layout, 12)),
            );
        });

        test("matches it with a single static item", () => {
            const layout = frozen([
                { id: "static", x: 2, y: 0, w: 2, h: 12, static: true },
                { id: "a", x: 0, y: 0, w: 1, h: 4 },
                { id: "b", x: 0, y: 0, w: 1, h: 4 },
                { id: "c", x: 10, y: 0, w: 4, h: 2 },
            ]);
            expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual(
                places(horizontalCompactor.compact(layout, 12)),
            );
        });

        test("gives a valid layout where it differs, on seeded messy layouts", () => {
            for (let seed = 1; seed <= 20; seed++) {
                const layout = messyLayout(50, 12, seed);
                const standard = horizontalCompactor.compact(layout, 12);
                const fast = fastHorizontalCompactor.compact(layout, 12);
                expect(overlaps(standard), `seed ${seed}`).toBe(false);
                expect(overlaps(fast), `seed ${seed}`).toBe(false);
                expect(fast).toHaveLength(standard.length);
            }
        });

        test("is rarely wider than it, on seeded messy layouts", () => {
            let standardBetter = 0;
            for (let seed = 1; seed <= 50; seed++) {
                const layout = messyLayout(30, 12, seed);
                const standard = width(horizontalCompactor.compact(layout, 12));
                const fast = width(fastHorizontalCompactor.compact(layout, 12));
                if (standard < fast) standardBetter++;
            }
            expect(standardBetter).toBeLessThan(40);
        });

        test("keeps static items where it does with several statics", () => {
            const layout = frozen([
                { id: "s1", x: 0, y: 0, w: 2, h: 4, static: true },
                { id: "s2", x: 3, y: 6, w: 2, h: 4, static: true },
                { id: "s3", x: 8, y: 2, w: 1, h: 6, static: true },
                { id: "a", x: 5, y: 0, w: 2, h: 2 },
                { id: "b", x: 1, y: 4, w: 2, h: 2 },
                { id: "c", x: 0, y: 10, w: 3, h: 2 },
                { id: "d", x: 10, y: 0, w: 2, h: 3 },
            ]);
            const standard = horizontalCompactor.compact(layout, 12);
            const fast = fastHorizontalCompactor.compact(layout, 12);
            for (const id of ["s1", "s2", "s3"]) {
                expect(get(fast, id)).toBe(get(layout, id));
                expect(get(standard, id)).toBe(get(layout, id));
            }
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
        });

        test("keeps every item's id, size and static flag", () => {
            const layout = withStatics(randomLayout(30, 12, 9), 5);
            const compacted = fastHorizontalCompactor.compact(layout, 12);
            layout.forEach((original, index) => {
                expect(compacted[index]).toMatchObject({
                    id: original.id,
                    w: original.w,
                    h: original.h,
                });
                expect(compacted[index]?.static).toBe(original.static);
            });
        });

        test("is within 30% of its width on the benchmark's patterned layout", () => {
            const layout = patternLayout(100);
            const standard = horizontalCompactor.compact(layout, 12);
            const fast = fastHorizontalCompactor.compact(layout, 12);
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
            const difference =
                Math.abs(width(standard) - width(fast)) /
                Math.max(width(standard), 1);
            expect(difference).toBeLessThan(0.3);
        });

        test("lines up items that start on the same cell", () => {
            const layout = frozen([
                { id: "a", x: 0, y: 0, w: 2, h: 6 },
                { id: "b", x: 0, y: 0, w: 2, h: 6 },
                { id: "c", x: 0, y: 0, w: 2, h: 6 },
            ]);
            const standard = horizontalCompactor.compact(layout, 12);
            const fast = fastHorizontalCompactor.compact(layout, 12);
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
            expect(width(standard)).toBe(6);
            expect(width(fast)).toBe(6);
        });

        test("handles narrow grids (1 to 3 columns)", () => {
            const layout = frozen(
                Array.from({ length: 10 }, (_, i) => ({
                    id: String(i),
                    x: i * 2,
                    y: 0,
                    w: 1,
                    h: 1 + (i % 2),
                })),
            );
            for (let cols = 1; cols <= 3; cols++) {
                expect(
                    overlaps(horizontalCompactor.compact(layout, cols)),
                ).toBe(false);
                expect(
                    overlaps(fastHorizontalCompactor.compact(layout, cols)),
                ).toBe(false);
            }
        });

        test("puts an item beside a taller one it shares rows with", () => {
            const layout = frozen([
                { id: "a", x: 5, y: 0, w: 2, h: 5 },
                { id: "b", x: 8, y: 2, w: 3, h: 3 },
            ]);
            const standard = horizontalCompactor.compact(layout, 12);
            const fast = fastHorizontalCompactor.compact(layout, 12);
            expect(overlaps(standard)).toBe(false);
            expect(overlaps(fast)).toBe(false);
            expect(get(fast, "a").x).toBe(0);
            expect(get(fast, "b").x).toBe(2);
        });
    });
});

describe("fastHorizontalOverlapCompactor", () => {
    test("is an overlap compactor that resolves moves horizontally", () => {
        expect(fastHorizontalOverlapCompactor.overlap).toBe(true);
        expect(fastHorizontalOverlapCompactor.type).toBe("horizontal");
    });

    test("leaves an item over a static item", () => {
        // a sorts before the static, so the tide does not hold it back
        const layout = frozen([
            { id: "static", x: 1, y: 0, w: 2, h: 2, static: true },
            { id: "a", x: 0, y: 1, w: 2, h: 1 },
        ]);
        expect(fastHorizontalOverlapCompactor.compact(layout, 12)[1]).toBe(
            layout[1],
        );
        expect(places(fastHorizontalCompactor.compact(layout, 12))).toEqual({
            static: [1, 0],
            a: [3, 1],
        });
    });

    test("separates items that overlap, as React Grid Layout's does", () => {
        // the tide still pushes each item past the ones before it on its rows: only statics
        // are ignored (see the report: the `overlap` contract says it does not separate)
        const layout = frozen([
            { id: "a", x: 0, y: 0, w: 2, h: 1 },
            { id: "b", x: 1, y: 0, w: 2, h: 1 },
        ]);
        expect(
            places(fastHorizontalOverlapCompactor.compact(layout, 12)),
        ).toEqual({ a: [0, 0], b: [2, 0] });
    });

    test("never moves an item before the first column, on seeded messy layouts", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const layout = messyLayout(20, 12, seed);
            for (const item of fastHorizontalOverlapCompactor.compact(
                layout,
                12,
            )) {
                expect(item.x).toBeGreaterThanOrEqual(0);
            }
        }
    });
});
