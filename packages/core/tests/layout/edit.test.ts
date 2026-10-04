import { describe, expect, it } from "vitest";
import { overlaps } from "../../src/layout/collision";
import { noCompactor, verticalCompactor } from "../../src/layout/compact";
import {
    addItem,
    compactLayout,
    firstFreeCell,
    removeItem,
    resizeItem,
} from "../../src/layout/edit";
import { resizeRect, sideEdges } from "../../src/layout/resize";
import { type LayoutItem, RESIZE_SIDES } from "../../src/layout/types";
import { boxes, frozen, get } from "./helpers";

// Resizing, adding and removing: the opposite edge stays put (React Grid Layout's
// resizeItemInDirection cases, test/spec/utils-test.js), limits and bounds hold, and every
// change returns a settled layout without touching its (frozen) input.

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

describe("a side's edges", () => {
    it("names the inline and the block edge each side moves", () => {
        expect(sideEdges("top")).toEqual({ inline: null, block: "top" });
        expect(sideEdges("end")).toEqual({ inline: "end", block: null });
        expect(sideEdges("bottom-start")).toEqual({
            inline: "start",
            block: "bottom",
        });
        expect(RESIZE_SIDES).toHaveLength(8);
    });
});

describe("the resized box", () => {
    const bounds = { cols: 12, maxRows: 20 };
    const box = item("A", 4, 4, 4, 4);

    it("keeps the end edge when resizing from the start", () => {
        expect(resizeRect(box, "start", { w: 6, h: 4 }, bounds)).toEqual({
            x: 2,
            y: 4,
            w: 6,
            h: 4,
        });
        expect(resizeRect(box, "start", { w: 2, h: 4 }, bounds)).toEqual({
            x: 6,
            y: 4,
            w: 2,
            h: 4,
        });
    });

    it("stops at the first column when growing from the start", () => {
        expect(resizeRect(box, "start", { w: 30, h: 4 }, bounds)).toEqual({
            x: 0,
            y: 4,
            w: 8,
            h: 4,
        });
    });

    it("keeps the bottom edge when shrinking from the top (react-grid-layout#2203)", () => {
        expect(resizeRect(box, "top", { w: 4, h: 2 }, bounds)).toEqual({
            x: 4,
            y: 6,
            w: 4,
            h: 2,
        });
    });

    it("stops at the first row when growing from the top", () => {
        expect(resizeRect(box, "top", { w: 4, h: 30 }, bounds)).toEqual({
            x: 4,
            y: 0,
            w: 4,
            h: 8,
        });
    });

    it("stops at the last column and at maxRows from the end and the bottom", () => {
        expect(resizeRect(box, "bottom-end", { w: 30, h: 30 }, bounds)).toEqual(
            {
                x: 4,
                y: 4,
                w: 8,
                h: 16,
            },
        );
    });

    it("keeps the axis a side does not touch", () => {
        expect(resizeRect(box, "end", { w: 6, h: 9 }, bounds)).toEqual({
            x: 4,
            y: 4,
            w: 6,
            h: 4,
        });
        expect(resizeRect(box, "bottom", { w: 9, h: 6 }, bounds)).toEqual({
            x: 4,
            y: 4,
            w: 4,
            h: 6,
        });
    });

    it("holds the item's own limits, and never less than one", () => {
        const limited = item("A", 4, 4, 4, 4, {
            minW: 2,
            maxW: 5,
            minH: 3,
            maxH: 6,
        });
        expect(
            resizeRect(limited, "bottom-end", { w: 9, h: 9 }, bounds),
        ).toEqual({
            x: 4,
            y: 4,
            w: 5,
            h: 6,
        });
        expect(
            resizeRect(limited, "top-start", { w: 0, h: 0 }, bounds),
        ).toEqual({
            x: 6,
            y: 5,
            w: 2,
            h: 3,
        });
        expect(resizeRect(box, "end", { w: -4, h: 4 }, bounds).w).toBe(1);
    });
});

describe("resizeItem", () => {
    const rules = { cols: 4, compactor: verticalCompactor };

    it("pushes what an item grows into, then settles", () => {
        const input = frozen([
            item("A", 0, 0, 2, 1),
            item("B", 2, 0, 2, 1),
            item("C", 0, 1, 2, 1),
        ]);
        const result = resizeItem(input, "A", { w: 3, h: 1 }, "end", rules);
        expect(boxes(result)).toEqual({
            A: [0, 0, 3, 1],
            B: [2, 1, 2, 1],
            C: [0, 1, 2, 1],
        });
        expect(overlaps(result)).toBe(false);
    });

    it("pushes what an item grows into from the start", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 2, 0, 2, 1)]);
        const result = resizeItem(input, "B", { w: 3, h: 1 }, "start", rules);
        expect(get(result, "B")).toMatchObject({ x: 1, w: 3 });
        expect(overlaps(result)).toBe(false);
    });

    it("keeps its place when it grows into a taller neighbour that starts higher", () => {
        const input = frozen([item("B", 3, 0, 1, 5), item("A", 0, 2, 2, 1)]);
        const result = resizeItem(input, "A", { w: 4, h: 1 }, "end", rules);
        expect(get(result, "A")).toMatchObject({ x: 0, w: 4 });
        expect(get(result, "A").y).toBeLessThan(get(result, "B").y);
        expect(overlaps(result)).toBe(false);
    });

    it("keeps its place growing down into an item in free mode", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 0, 1, 2, 1)]);
        const result = resizeItem(input, "A", { w: 2, h: 2 }, "bottom", {
            cols: 4,
            compactor: noCompactor,
        });
        expect(boxes(result)).toEqual({ A: [0, 0, 2, 2], B: [0, 2, 2, 1] });
    });

    it("refuses a resize into an occupied cell under preventCollision", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 2, 0, 2, 1)]);
        expect(
            resizeItem(input, "A", { w: 3, h: 1 }, "end", {
                ...rules,
                preventCollision: true,
            }),
        ).toBe(input);
    });

    it("never resizes a static item, and returns the same layout for no change", () => {
        const input = frozen([
            item("S", 0, 0, 2, 1, { static: true }),
            item("A", 2, 0, 2, 1),
        ]);
        expect(resizeItem(input, "S", { w: 3, h: 1 }, "end", rules)).toBe(
            input,
        );
        expect(resizeItem(input, "A", { w: 2, h: 1 }, "end", rules)).toBe(
            input,
        );
        expect(resizeItem(input, "nope", { w: 2, h: 1 }, "end", rules)).toBe(
            input,
        );
    });

    it("lets items overlap under allowOverlap", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 2, 0, 2, 1)]);
        const result = resizeItem(input, "A", { w: 3, h: 1 }, "end", {
            ...rules,
            compactor: noCompactor,
            allowOverlap: true,
        });
        expect(boxes(result)).toEqual({ A: [0, 0, 3, 1], B: [2, 0, 2, 1] });
    });
});

describe("adding and removing", () => {
    const rules = { cols: 4, compactor: verticalCompactor };

    it("finds the first free cell in reading order", () => {
        const layout = frozen([item("A", 0, 0, 2, 2), item("B", 3, 0, 1, 1)]);
        expect(firstFreeCell(layout, { w: 1, h: 1 }, 4)).toEqual({
            x: 2,
            y: 0,
        });
        expect(firstFreeCell(layout, { w: 2, h: 1 }, 4)).toEqual({
            x: 2,
            y: 1,
        });
        expect(firstFreeCell(layout, { w: 4, h: 1 }, 4)).toEqual({
            x: 0,
            y: 2,
        });
        expect(firstFreeCell(frozen([]), { w: 2, h: 2 }, 4)).toEqual({
            x: 0,
            y: 0,
        });
    });

    it("adds an item at the first free cell when it names none", () => {
        const input = frozen([item("A", 0, 0, 2, 2)]);
        const result = addItem(input, { id: "N", w: 2, h: 1 }, rules);
        expect(get(result, "N")).toMatchObject({ x: 2, y: 0 });
        expect(result[0]).toBe(input[0]);
    });

    it("adds an item where it says, pushing what is there", () => {
        const input = frozen([item("A", 0, 0, 2, 2)]);
        const result = addItem(
            input,
            { id: "N", x: 0, y: 0, w: 2, h: 1 },
            rules,
        );
        expect(boxes(result)).toEqual({ A: [0, 1, 2, 2], N: [0, 0, 2, 1] });
    });

    it("adds a static where it says, the others settling around it", () => {
        const input = frozen([item("A", 0, 0, 2, 2)]);
        const result = addItem(
            input,
            { id: "S", x: 0, y: 0, w: 1, h: 1, static: true },
            rules,
        );
        expect(boxes(result)).toEqual({ A: [0, 1, 2, 2], S: [0, 0, 1, 1] });
    });

    it("keeps an added item inside the columns", () => {
        const result = addItem(
            frozen([]),
            { id: "N", x: 3, y: 0, w: 9, h: 1 },
            rules,
        );
        expect(boxes(result)).toEqual({ N: [0, 0, 4, 1] });
    });

    it("removes an item and settles, or returns the same layout for an unknown id", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 0, 1, 2, 1)]);
        expect(boxes(removeItem(input, "A", rules))).toEqual({
            B: [0, 0, 2, 1],
        });
        expect(removeItem(input, "nope", rules)).toBe(input);
    });

    it("leaves a layout that needs no compaction as it is", () => {
        const input = frozen([item("A", 0, 0, 2, 1), item("B", 0, 1, 2, 1)]);
        expect(compactLayout(input, rules)).toBe(input);
        expect(compactLayout(input, { ...rules, allowOverlap: true })).toBe(
            input,
        );
    });
});
