import { describe, expect, it } from "vitest";
import {
    cellAt,
    columnWidth,
    containerHeight,
    type GridGeometry,
    itemPixels,
    unitsAt,
} from "../../src/layout/geometry";

// Grid units to pixels: the cases of React Grid Layout's spec (test/spec/utils-test.js,
// calcGridColWidth, calcGridItemPosition, calcWH, calcXY; margin-consistency.test.ts), ported.

const base: GridGeometry = {
    width: 800,
    cols: 8,
    rowHeight: 50,
    gap: [0, 0],
    padding: [0, 0],
};

describe("the column width", () => {
    it("divides the width by the columns", () => {
        expect(columnWidth(base)).toBe(100);
    });

    it("takes off the gaps", () => {
        expect(columnWidth({ ...base, gap: [10, 10] })).toBe(91.25);
    });

    it("takes off the padding", () => {
        expect(columnWidth({ ...base, padding: [100, 0] })).toBe(75);
    });

    it("takes off both", () => {
        expect(columnWidth({ ...base, gap: [10, 0], padding: [100, 0] })).toBe(
            66.25,
        );
    });
});

describe("an item's pixels", () => {
    it("places and sizes an item, rounded to whole pixels", () => {
        const geometry = {
            ...base,
            gap: [10, 10],
            padding: [100, 100],
        } as const;
        expect(itemPixels(geometry, { x: 1, y: 1, w: 2, h: 2 })).toEqual({
            left: 176,
            top: 160,
            width: 143,
            height: 110,
        });
    });

    for (const [gap, width, cols] of [
        [1, 1200, 12],
        [5, 1000, 10],
        [0, 1200, 12],
        [7, 1003, 9],
    ] as const) {
        it(`keeps every gap exactly ${gap}px, none at 0 (react-grid-layout#2141, PR #2150)`, () => {
            const geometry: GridGeometry = {
                width,
                cols,
                rowHeight: 30,
                gap: [gap, gap],
                padding: [10, 10],
            };
            for (let x = 0; x < cols - 1; x++) {
                const a = itemPixels(geometry, { x, y: 0, w: 1, h: 1 });
                const b = itemPixels(geometry, { x: x + 1, y: 0, w: 1, h: 1 });
                expect(b.left - (a.left + a.width)).toBe(gap);
            }
            for (let y = 0; y < 9; y++) {
                const a = itemPixels(geometry, { x: 0, y, w: 1, h: 1 });
                const b = itemPixels(geometry, { x: 0, y: y + 1, w: 1, h: 1 });
                expect(b.top - (a.top + a.height)).toBe(gap);
            }
        });
    }
});

describe("from pixels", () => {
    it("finds the nearest columns and rows of a size, at least one", () => {
        const geometry: GridGeometry = {
            ...base,
            width: 400,
            cols: 4,
            rowHeight: 200,
        };
        expect(unitsAt(geometry, 100, 200)).toEqual({ w: 1, h: 1 });
        expect(unitsAt(geometry, 200, 200)).toEqual({ w: 2, h: 1 });
        expect(unitsAt(geometry, 100, 400)).toEqual({ w: 1, h: 2 });
        expect(unitsAt(geometry, 10, 10)).toEqual({ w: 1, h: 1 });
    });

    it("finds the nearest cell of a position, with gaps and padding", () => {
        const geometry: GridGeometry = {
            width: 1000,
            cols: 4,
            rowHeight: 100,
            gap: [20, 20],
            padding: [50, 50],
        };
        expect(cellAt(geometry, 50, 50)).toEqual({ x: 0, y: 0 });
        const second = itemPixels(geometry, { x: 1, y: 1, w: 1, h: 1 });
        expect(cellAt(geometry, second.left, second.top)).toEqual({
            x: 1,
            y: 1,
        });
        expect(cellAt(geometry, -500, -500)).toEqual({ x: -2, y: -5 });
    });
});

describe("the container's height", () => {
    it("holds the rows, the gaps between them and the padding", () => {
        const geometry: GridGeometry = {
            ...base,
            rowHeight: 30,
            gap: [10, 10],
            padding: [5, 5],
        };
        expect(containerHeight(geometry, 3)).toBe(3 * 30 + 2 * 10 + 2 * 5);
    });

    it("is the padding alone for an empty layout", () => {
        const geometry: GridGeometry = {
            ...base,
            rowHeight: 30,
            gap: [10, 10],
            padding: [5, 5],
        };
        expect(containerHeight(geometry, 0)).toBe(10);
    });
});
