import { describe, expect, it } from "vitest";
import { overlaps } from "../../src/layout/collision";
import {
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "../../src/layout/compact";
import type { LayoutItem } from "../../src/layout/types";
import { boxes, frozen, get } from "./helpers";

// Compaction: the cases of React Grid Layout's spec (test/spec/utils-test.js, compact vertical
// and horizontal; static-compaction.test.ts), ported, every one on a frozen layout.

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

describe("the vertical compactor", () => {
    it("removes the empty space above an item", () => {
        expect(
            boxes(
                verticalCompactor.compact(frozen([item("1", 0, 1, 1, 1)]), 10),
            ),
        ).toEqual({
            "1": [0, 0, 1, 1],
        });
    });

    it("resolves a collision by moving the later item down", () => {
        const layout = frozen([item("1", 0, 0, 1, 5), item("2", 0, 1, 1, 1)]);
        expect(boxes(verticalCompactor.compact(layout, 10))).toEqual({
            "1": [0, 0, 1, 5],
            "2": [0, 5, 1, 1],
        });
    });

    it("moves new collisions out of the way first, recursively", () => {
        const layout = frozen([
            item("1", 0, 0, 2, 5),
            item("2", 0, 0, 10, 1),
            item("3", 5, 1, 1, 1),
            item("4", 5, 2, 1, 1),
            item("5", 5, 3, 1, 1, { static: true }),
        ]);
        expect(boxes(verticalCompactor.compact(layout, 10))).toEqual({
            "1": [0, 0, 2, 5],
            "2": [0, 5, 10, 1],
            "3": [5, 6, 1, 1],
            "4": [5, 7, 1, 1],
            "5": [5, 3, 1, 1],
        });
    });

    it("compacts around statics scattered through the layout (react-grid-layout#1309)", () => {
        const layout = frozen([
            item("A", 0, 113, 59, 5, { static: true }),
            item("B", 0, 74, 59, 5, { static: true }),
            item("C", 0, 35, 59, 5, { static: true }),
            item("D", 0, 0, 40, 20),
            item("E", 0, 20, 40, 20),
            item("F", 0, 40, 20, 20),
            item("G", 20, 40, 20, 20),
            item("H", 0, 60, 20, 10),
            item("I", 20, 60, 20, 10),
        ]);
        const out = verticalCompactor.compact(layout, 60);
        expect(get(out, "A").y).toBe(113);
        expect(get(out, "B").y).toBe(74);
        expect(get(out, "C").y).toBe(35);
        expect(get(out, "D").y).toBe(0);
        expect(get(out, "E").y).toBe(40);
        expect(get(out, "F").y).toBe(79);
        expect(get(out, "G").y).toBe(79);
        expect(get(out, "H").y).toBe(99);
        expect(get(out, "I").y).toBe(99);
    });

    it("keeps the early break without statics, with the same result", () => {
        const layout = frozen([
            item("A", 0, 0, 2, 2),
            item("B", 0, 5, 2, 2),
            item("C", 0, 10, 2, 2),
        ]);
        expect(boxes(verticalCompactor.compact(layout, 10))).toEqual({
            A: [0, 0, 2, 2],
            B: [0, 2, 2, 2],
            C: [0, 4, 2, 2],
        });
    });

    it("shares the items that did not move and keeps the input's order", () => {
        const layout = frozen([item("B", 0, 3, 1, 1), item("A", 1, 0, 1, 1)]);
        const out = verticalCompactor.compact(layout, 10);
        expect(out.map((entry) => entry.id)).toEqual(["B", "A"]);
        expect(out[1]).toBe(layout[1]);
        expect(out[0]).not.toBe(layout[0]);
    });
});

describe("the horizontal compactor", () => {
    it("removes the empty space before an item", () => {
        expect(
            boxes(
                horizontalCompactor.compact(
                    frozen([item("1", 5, 5, 1, 1)]),
                    10,
                ),
            ),
        ).toEqual({
            "1": [0, 5, 1, 1],
        });
    });

    it("resolves a collision by moving the later item toward the end", () => {
        const layout = frozen([item("1", 0, 0, 5, 1), item("2", 1, 0, 1, 1)]);
        expect(boxes(horizontalCompactor.compact(layout, 10))).toEqual({
            "1": [0, 0, 5, 1],
            "2": [5, 0, 1, 1],
        });
    });

    it("moves new collisions out of the way first, recursively", () => {
        const layout = frozen([
            item("1", 0, 0, 5, 2),
            item("2", 0, 1, 1, 10),
            item("3", 1, 5, 1, 1),
            item("4", 2, 5, 1, 1),
            item("5", 2, 5, 1, 1, { static: true }),
        ]);
        expect(boxes(horizontalCompactor.compact(layout, 10))).toEqual({
            "1": [0, 0, 5, 2],
            "2": [5, 1, 1, 10],
            "3": [6, 5, 1, 1],
            "4": [7, 5, 1, 1],
            "5": [2, 5, 1, 1],
        });
    });

    it("wraps an item past the last column to the next row, as far toward the start as it goes", () => {
        const layout = frozen([
            item("1", 0, 0, 2, 2),
            item("2", 2, 0, 2, 2),
            item("3", 4, 0, 2, 2),
            item("4", -2, -2, 2, 2),
        ]);
        expect(boxes(horizontalCompactor.compact(layout, 6))).toEqual({
            "1": [2, 0, 2, 2],
            "2": [4, 0, 2, 2],
            "3": [0, 2, 2, 2],
            "4": [0, 0, 2, 2],
        });
    });
});

describe("no compaction", () => {
    it("keeps items where they are and closes no gap", () => {
        const layout = frozen([item("A", 3, 4, 1, 1), item("B", 0, 9, 2, 1)]);
        const out = noCompactor.compact(layout, 10);
        expect(out[0]).toBe(layout[0]);
        expect(out[1]).toBe(layout[1]);
    });

    it("pushes down what overlaps, never up, statics first", () => {
        const layout = frozen([
            item("A", 0, 0, 2, 2),
            item("B", 1, 1, 2, 2),
            item("S", 0, 2, 1, 1, { static: true }),
        ]);
        const out = noCompactor.compact(layout, 10);
        expect(overlaps(out)).toBe(false);
        expect(boxes(out)).toEqual({
            A: [0, 0, 2, 2],
            B: [1, 2, 2, 2],
            S: [0, 2, 1, 1],
        });
    });
});
