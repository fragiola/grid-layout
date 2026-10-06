import { describe, expect, test } from "vitest";
import { createCompactor, type SettlingItem } from "../../src/compactors";
import { collides } from "../../src/layout/collision";
import { compactLayout } from "../../src/layout/edit";
import { frozen, get } from "../layout/helpers";
import { places } from "./layouts";

// A custom compactor written the way an app would: each item slides toward the start while it
// overlaps nothing already placed.
const gravityToStart = createCompactor(
    "horizontal",
    "column",
    (item, { placed }) => {
        while (item.x > 0) {
            item.x--;
            if (placed.some((other) => collides(item, other))) {
                item.x++;
                return;
            }
        }
    },
);

describe("createCompactor", () => {
    test("names how a move pushes", () => {
        expect(gravityToStart.type).toBe("horizontal");
        expect(gravityToStart.overlap).toBeUndefined();
    });

    test("settles a gravity-to-the-start compactor in column order", () => {
        const layout = frozen([
            { id: "a", x: 5, y: 0, w: 2, h: 1 },
            { id: "b", x: 9, y: 0, w: 1, h: 1 },
            { id: "c", x: 3, y: 1, w: 2, h: 2 },
            { id: "d", x: 4, y: 2, w: 1, h: 1 },
        ]);
        // c first (column 3), then d (column 4: stops against c), a (column 5), b (column 9)
        expect(places(gravityToStart.compact(layout, 12))).toEqual({
            a: [0, 0],
            b: [2, 0],
            c: [0, 1],
            d: [2, 2],
        });
    });

    test("keeps static items, and settles the others against them", () => {
        const layout = frozen([
            { id: "static", x: 2, y: 0, w: 1, h: 2, static: true },
            { id: "a", x: 6, y: 0, w: 2, h: 1 },
            { id: "b", x: 1, y: 1, w: 1, h: 1 },
        ]);
        const compacted = gravityToStart.compact(layout, 12);
        expect(get(compacted, "static")).toBe(get(layout, "static"));
        expect(places(compacted)).toEqual({
            static: [2, 0],
            a: [3, 0],
            b: [0, 1],
        });
    });

    test("keeps the object of every item it does not move, and the layout's order", () => {
        const layout = frozen([
            { id: "b", x: 4, y: 0, w: 1, h: 1 },
            { id: "a", x: 0, y: 0, w: 2, h: 1, minW: 1 },
        ]);
        const compacted = gravityToStart.compact(layout, 12);
        expect(compacted.map((item) => item.id)).toEqual(["b", "a"]);
        expect(compacted[1]).toBe(layout[1]);
        expect(compacted[0]).toEqual({ id: "b", x: 2, y: 0, w: 1, h: 1 });
        // settled already: compactLayout gives the very same layout
        const settled = frozen([...compacted]);
        expect(
            compactLayout(settled, { cols: 12, compactor: gravityToStart }),
        ).toBe(settled);
    });

    test("visits the items in the order it names, statics placed first", () => {
        const layout = frozen([
            { id: "static", x: 5, y: 5, w: 1, h: 1, static: true },
            { id: "a", x: 3, y: 0, w: 1, h: 1 },
            { id: "b", x: 0, y: 1, w: 1, h: 1 },
            { id: "c", x: 1, y: 0, w: 1, h: 1 },
        ]);
        const visits = (order: "row" | "column") => {
            const seen: string[][] = [];
            createCompactor(
                "vertical",
                order,
                (item: SettlingItem, context) => {
                    expect(context.cols).toBe(6);
                    seen.push([item.id, ...context.placed.map((p) => p.id)]);
                },
            ).compact(layout, 6);
            return seen;
        };
        expect(visits("row")).toEqual([
            ["c", "static"],
            ["a", "static", "c"],
            ["b", "static", "c", "a"],
        ]);
        expect(visits("column")).toEqual([
            ["b", "static"],
            ["c", "static", "b"],
            ["a", "static", "b", "c"],
        ]);
    });
});
