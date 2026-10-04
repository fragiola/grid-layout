import { describe, expect, it } from "vitest";
import { overlaps } from "../../src/layout/collision";
import { noCompactor, verticalCompactor } from "../../src/layout/compact";
import { layoutProblems, normaliseLayout } from "../../src/layout/normalise";
import type { Layout, LayoutItem } from "../../src/layout/types";
import { boxes, frozen, get } from "./helpers";

// A layout from the app, made valid: problems named instead of thrown, then corrected
// (React Grid Layout's correctBounds cases) and settled.

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra = {},
): LayoutItem => ({
    id,
    x,
    y,
    w,
    h,
    ...extra,
});

function valid(
    layout: Layout,
    cols = 12,
    compactor = verticalCompactor,
): Layout {
    const result = normaliseLayout(layout, { cols, compactor });
    if (!result.ok) throw new Error(JSON.stringify(result.problems));
    return result.layout;
}

describe("layout problems", () => {
    it("accepts an empty and a well-formed layout", () => {
        expect(layoutProblems([])).toEqual([]);
        expect(layoutProblems([item("A", 0, 0, 1, 1)])).toEqual([]);
        expect(
            layoutProblems([item("A", 0, Number.POSITIVE_INFINITY, 1, 1)]),
        ).toEqual([]);
        expect(
            layoutProblems([
                item("A", 0, 0, 1, 1, { maxH: Number.POSITIVE_INFINITY }),
            ]),
        ).toEqual([]);
    });

    it("names what is wrong, at its index", () => {
        expect(layoutProblems("nope")).toEqual([
            { index: undefined, message: "a layout is an array of items" },
        ]);
        expect(
            layoutProblems([
                item("A", 0, 0, 1, 1),
                item("A", 0, 1, 1, 1),
                { id: "", x: 0.5, y: Number.NaN, w: 0, h: "2" },
                item("B", 0, 0, 1, 1, { minW: 0 }),
                null,
            ]).map((problem) => `${problem.index}: ${problem.message}`),
        ).toEqual([
            '1: id "A" is used twice',
            "2: id must be a non-empty string",
            "2: x must be an integer",
            "2: y must be an integer (or Infinity: below everything)",
            "2: w must be an integer of at least 1",
            "2: h must be an integer of at least 1",
            "3: minW must be an integer of at least 1",
            "4: an item is an object",
        ]);
    });

    it("refuses an invalid layout instead of throwing", () => {
        const result = normaliseLayout(frozen([item("A", 0, 0, 0, 1)]), {
            cols: 4,
        });
        expect(result.ok).toBe(false);
    });
});

describe("normalising", () => {
    it("returns the very same layout when it is already valid and settled", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 2, 0, 2, 1)]);
        expect(valid(input)).toBe(input);
    });

    it("moves an item past the last column back in", () => {
        expect(boxes(valid(frozen([item("A", 10, 0, 4, 1)])))).toEqual({
            A: [8, 0, 4, 1],
        });
    });

    it("moves an item left of the first column in, keeping its width", () => {
        expect(boxes(valid(frozen([item("A", -2, 0, 4, 1)])))).toEqual({
            A: [0, 0, 4, 1],
        });
    });

    it("narrows an item wider than the grid", () => {
        expect(boxes(valid(frozen([item("A", 0, 0, 20, 1)]), 6))).toEqual({
            A: [0, 0, 6, 1],
        });
    });

    it("places y: Infinity below everything before it (react-grid-layout#2161)", () => {
        const layout = frozen([
            item("A", 0, 0, 2, 3),
            item("B", 0, Number.POSITIVE_INFINITY, 2, 1),
        ]);
        expect(boxes(valid(layout, 12, noCompactor))).toEqual({
            A: [0, 0, 2, 3],
            B: [0, 3, 2, 1],
        });
    });

    it("brings sizes within the item's limits", () => {
        const layout = frozen([item("A", 0, 0, 1, 9, { minW: 2, maxH: 4 })]);
        expect(boxes(valid(layout))).toEqual({ A: [0, 0, 2, 4] });
    });

    it("moves overlapping statics apart, downward", () => {
        const layout = frozen([
            item("S", 0, 0, 2, 2, { static: true }),
            item("T", 1, 1, 2, 2, { static: true }),
        ]);
        expect(boxes(valid(layout))).toEqual({
            S: [0, 0, 2, 2],
            T: [1, 2, 2, 2],
        });
    });

    it("turns a messy layout into a valid one", () => {
        const messy = frozen([
            item("A", 0, 0, 4, 2),
            item("B", 2, 1, 4, 2),
            item("C", 11, 5, 3, 1),
            item("D", -1, Number.POSITIVE_INFINITY, 2, 2),
            item("S", 0, 3, 2, 1, { static: true }),
            item("T", 1, 3, 2, 1, { static: true }),
        ]);
        for (const compactor of [verticalCompactor, noCompactor]) {
            const result = valid(messy, 12, compactor);
            expect(overlaps(result)).toBe(false);
            for (const entry of result) {
                expect(entry.x).toBeGreaterThanOrEqual(0);
                expect(entry.x + entry.w).toBeLessThanOrEqual(12);
                expect(entry.y).toBeGreaterThanOrEqual(0);
            }
            expect(get(result, "S")).toMatchObject({ x: 0, y: 3 });
            expect(get(result, "T")).toMatchObject({ x: 1, y: 4 });
        }
    });
});
