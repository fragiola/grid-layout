import { describe, expect, it } from "vitest";
import { overlaps } from "../../src/layout/collision";
import {
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "../../src/layout/compact";
import { moveItem } from "../../src/layout/edit";
import type { Compactor, LayoutItem } from "../../src/layout/types";
import { boxes, frozen, get, rawAway, rawMove } from "./helpers";

// Moving with push: the cases of React Grid Layout's spec (test/spec/utils-test.js, moveElement
// and moveElementAwayFromCollision), ported, every one on a frozen layout.

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

/** React Grid Layout's "compactAndMove": a move, then a compaction. */
function moveThenCompact(
    layout: LayoutItem[],
    id: string,
    x: number,
    y: number,
    compactor: Compactor,
    cols: number,
) {
    const moved = rawMove(layout, id, x, y, { compactType: compactor.type });
    return compactor.compact(moved, cols);
}

describe("moving with push (React Grid Layout's moveElement)", () => {
    it("does not change the layout on a collision under preventCollision", () => {
        const layout = [item("1", 0, 1, 1, 1), item("2", 1, 2, 1, 1)];
        const input = frozen(layout);
        expect(
            moveItem(input, "1", 1, 2, {
                cols: 2,
                compactor: noCompactor,
                preventCollision: true,
            }),
        ).toBe(input);
        expect(
            boxes(
                rawMove(layout, "1", 1, 2, {
                    compactType: "none",
                    preventCollision: true,
                }),
            ),
        ).toEqual({ "1": [0, 1, 1, 1], "2": [1, 2, 1, 1] });
    });

    it("pushes the item it lands on in rearrangement mode", () => {
        const layout = [item("1", 0, 0, 1, 1), item("2", 1, 0, 1, 1)];
        expect(
            boxes(rawMove(layout, "1", 1, 0, { compactType: "vertical" })),
        ).toEqual({
            "1": [1, 0, 1, 1],
            "2": [1, 1, 1, 1],
        });
    });

    it("moves items out of the way without panel jumps, vertically", () => {
        // A moves down so it collides with C; B has the room above A and jumps there
        const layout = [
            item("A", 0, 0, 1, 10),
            item("B", 0, 10, 1, 1),
            item("C", 0, 11, 1, 1),
        ];
        expect(
            boxes(moveThenCompact(layout, "A", 0, 1, verticalCompactor, 10)),
        ).toEqual({
            A: [0, 1, 1, 10],
            B: [0, 0, 1, 1],
            C: [0, 11, 1, 1],
        });
    });

    it("finds the right collision when a large item moves far", () => {
        const layout = [
            item("A", 0, 0, 1, 10),
            item("B", 0, 10, 1, 1),
            item("C", 0, 11, 1, 1),
        ];
        expect(
            boxes(rawMove(layout, "A", 0, 2, { compactType: "vertical" })),
        ).toEqual({
            A: [0, 2, 1, 10],
            B: [0, 1, 1, 1],
            C: [0, 12, 1, 1],
        });
    });

    it("moves items out of the way without panel jumps (React Grid Layout example 13)", () => {
        const layout = [
            item("A", 0, 0, 1, 1),
            item("B", 1, 0, 1, 1),
            item("C", 0, 1, 2, 2),
        ];
        expect(
            boxes(rawMove(layout, "A", 1, 0, { compactType: "vertical" })),
        ).toEqual({
            A: [1, 0, 1, 1],
            B: [1, 1, 1, 1],
            C: [0, 2, 2, 2],
        });
    });

    it("moves items out of the way without panel jumps, horizontally", () => {
        const layout = [
            item("A", 0, 0, 10, 1),
            item("B", 11, 0, 1, 1),
            item("C", 12, 0, 1, 1),
        ];
        expect(
            boxes(rawMove(layout, "A", 2, 0, { compactType: "horizontal" })),
        ).toEqual({
            A: [2, 0, 10, 1],
            B: [1, 0, 1, 1],
            C: [12, 0, 1, 1],
        });
    });

    it("moves the panels below down when one lands on another (vertical, example 1)", () => {
        // | A | B |
        // |C|  D  |
        const layout = [
            item("A", 0, 0, 2, 1),
            item("B", 2, 0, 2, 1),
            item("C", 0, 1, 1, 1),
            item("D", 1, 1, 3, 1),
        ];
        expect(
            boxes(moveThenCompact(layout, "B", 1, 0, verticalCompactor, 4)),
        ).toEqual({
            A: [0, 1, 2, 1],
            B: [1, 0, 2, 1],
            C: [0, 2, 1, 1],
            D: [1, 2, 3, 1],
        });
    });

    it("does not lift B above A when C moves above A (vertical, example 2)", () => {
        const layout = [
            item("A", 0, 0, 2, 1),
            item("B", 0, 1, 1, 1),
            item("C", 1, 1, 1, 2),
        ];
        expect(
            boxes(moveThenCompact(layout, "C", 1, 0, verticalCompactor, 4)),
        ).toEqual({
            A: [0, 2, 2, 1],
            B: [0, 3, 1, 1],
            C: [1, 0, 1, 2],
        });
    });

    it("returns the very same layout when preventCollision refuses the move", () => {
        const layout = [
            item("A", 0, 0, 1, 10),
            item("B", 0, 10, 1, 1),
            item("C", 0, 11, 1, 1),
        ];
        const input = frozen(layout);
        const result = moveItem(input, "A", 0, 2, {
            cols: 10,
            compactor: noCompactor,
            preventCollision: true,
        });
        expect(result).toBe(input);
    });

    it("lets items overlap under allowOverlap, in a new layout (react-grid-layout#1606)", () => {
        const layout = [
            item("A", 0, 0, 1, 10),
            item("B", 0, 10, 1, 1),
            item("C", 0, 11, 1, 1),
        ];
        const input = frozen(layout);
        const result = moveItem(input, "A", 0, 2, {
            cols: 10,
            compactor: noCompactor,
            allowOverlap: true,
        });
        expect(result).not.toBe(input);
        expect(boxes(result)).toEqual({
            A: [0, 2, 1, 10],
            B: [0, 10, 1, 1],
            C: [0, 11, 1, 1],
        });
    });

    it("keeps a static item put when another lands on it", () => {
        const layout = [
            item("S", 0, 0, 2, 2, { static: true }),
            item("D", 2, 0, 2, 2),
        ];
        const result = rawMove(layout, "D", 0, 0, { compactType: "none" });
        expect(get(result, "S")).toMatchObject({ x: 0, y: 0 });
    });

    it("never moves a static item, even when a free-mode move lands on it from above", () => {
        const input = frozen([
            item("A", 0, 0, 2, 2),
            item("S", 0, 2, 2, 2, { static: true }),
        ]);
        const result = moveItem(input, "A", 0, 1, {
            cols: 4,
            compactor: noCompactor,
        });
        expect(get(result, "S")).toBe(input[1]);
        expect(overlaps(result)).toBe(false);
    });

    it("never moves a static item", () => {
        const input = frozen([item("S", 0, 0, 2, 2, { static: true })]);
        expect(moveItem(input, "S", 3, 3, { cols: 10 })).toBe(input);
    });

    it("leaves the moved item where it was under preventCollision", () => {
        const layout = [item("A", 0, 0, 2, 2), item("B", 0, 0, 2, 2)];
        const result = rawMove(layout, "B", 0, 0, {
            compactType: "none",
            preventCollision: true,
        });
        expect(get(result, "B").x).toBe(0);
    });
});

describe("pushing away (React Grid Layout's moveElementAwayFromCollision)", () => {
    it("moves down from the pushed item's own row on a collision to the north (react-grid-layout#2173)", () => {
        const layout = [
            item("A", 0, 0, 1, 6),
            item("B", 0, 5, 1, 2),
            item("C", 0, 7, 1, 2),
        ];
        expect(get(rawAway(layout, "B", "C", true, "vertical"), "C").y).toBe(8);
    });

    it("pushes a collider in free mode only until it clears a partial overlap (react-grid-layout#1982)", () => {
        const layout = [item("A", 0, 0, 2, 2), item("B", 0, 2, 2, 2)];
        expect(
            get(rawAway(layout, "B", "A", true, "none"), "B").y,
        ).toBeLessThan(4);
    });

    it("swaps equal-size items in free mode (react-grid-layout#1982)", () => {
        const layout = [item("A", 0, 0, 1, 1), item("B", 1, 0, 1, 1)];
        const result = rawAway(layout, "B", "A", true, "none");
        expect(get(result, "A").y).toBe(1);
        expect(get(result, "B").y).toBe(0);
    });

    it("leaves no large gap on a partial overlap in free mode (react-grid-layout#1982)", () => {
        const layout = [item("A", 0, 0, 2, 2), item("B", 0, 2, 2, 2)];
        const result = rawMove(layout, "A", 0, 1, { compactType: "none" });
        expect(get(result, "A").y).toBe(2);
        expect(get(result, "B").y).toBe(4);
    });
});

describe("moveItem", () => {
    const rules = { cols: 4, compactor: verticalCompactor };

    it("moves, pushes and settles, sharing the items that did not change", () => {
        const input = frozen([
            item("A", 0, 0, 2, 1),
            item("B", 2, 0, 2, 1),
            item("C", 0, 1, 1, 1),
        ]);
        const result = moveItem(input, "A", 2, 0, rules);
        expect(boxes(result)).toEqual({
            A: [2, 0, 2, 1],
            B: [2, 1, 2, 1],
            C: [0, 0, 1, 1],
        });
        expect(result).not.toBe(input);
    });

    it("keeps the target inside the grid", () => {
        const input = frozen([item("A", 0, 0, 2, 1)]);
        expect(boxes(moveItem(input, "A", 9, 0, rules))).toEqual({
            A: [2, 0, 2, 1],
        });
        expect(boxes(moveItem(input, "A", -3, 0, rules))).toEqual({
            A: [0, 0, 2, 1],
        });
        const bounded = moveItem(frozen([item("A", 0, 0, 1, 2)]), "A", 0, 9, {
            ...rules,
            compactor: noCompactor,
            maxRows: 4,
        });
        expect(boxes(bounded)).toEqual({ A: [0, 2, 1, 2] });
    });

    it("returns the same layout for an unknown item or the same cell", () => {
        const input = frozen([item("A", 0, 0, 2, 1)]);
        expect(moveItem(input, "nope", 1, 1, rules)).toBe(input);
        expect(moveItem(input, "A", 0, 0, rules)).toBe(input);
    });

    it("returns the same layout when compaction brings the item back where it was", () => {
        const input = frozen([item("A", 0, 0, 2, 1)]);
        // with vertical compaction an item alone cannot leave the first row
        expect(moveItem(input, "A", 0, 3, rules)).toBe(input);
    });

    it("never leaves two items overlapping in free mode", () => {
        const input = frozen([
            item("A", 0, 0, 2, 2),
            item("B", 2, 0, 2, 2),
            item("C", 0, 2, 4, 1),
        ]);
        const result = moveItem(input, "A", 1, 1, {
            cols: 4,
            compactor: noCompactor,
        });
        for (const a of result) {
            for (const b of result) {
                if (a === b) continue;
                const overlap =
                    a.x < b.x + b.w &&
                    a.x + a.w > b.x &&
                    a.y < b.y + b.h &&
                    a.y + a.h > b.y;
                expect(overlap, `${a.id} and ${b.id}`).toBe(false);
            }
        }
        // the free-mode swap (react-grid-layout#1982) may set the moved item below what it
        // swapped with: it still leaves where it was
        expect(get(result, "A")).not.toMatchObject({ x: 0, y: 0 });
    });

    it("pushes toward the end with the horizontal compactor", () => {
        const input = frozen([item("A", 0, 0, 1, 1), item("B", 1, 0, 1, 1)]);
        const result = moveItem(input, "A", 1, 0, {
            cols: 4,
            compactor: horizontalCompactor,
        });
        expect(boxes(result)).toEqual({ A: [1, 0, 1, 1], B: [0, 0, 1, 1] });
    });
});

describe("a move toward the start onto a neighbour", () => {
    it("react-grid-layout#2252 swaps the two under horizontal compaction", () => {
        const moved = moveItem(
            frozen([
                { id: "a", x: 0, y: 0, w: 1, h: 1 },
                { id: "b", x: 1, y: 0, w: 1, h: 1 },
            ]),
            "b",
            0,
            0,
            { cols: 12, compactor: horizontalCompactor },
        );
        expect(boxes(moved)).toEqual({ a: [1, 0, 1, 1], b: [0, 0, 1, 1] });
    });
});
