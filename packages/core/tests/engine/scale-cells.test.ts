// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cellPart, itemPart } from "../../src/engine/parts";
import { itemPixels } from "../../src/layout/geometry";
import { frozen } from "../layout/helpers";
import { flush, pointer, setup } from "./harness";

// A grid inside a CSS-scaled parent (K5): the scale is read off the root's box on screen against
// its layout size, at a gesture's start, and pointer positions are divided by it. And the grid's
// cells (K6): what a background draws, aligned with the items.

/** The viewport point inside cell (x, y), 5 px from its corner, on a grid drawn at `scale`. */
const at = (x: number, y: number, scale = 1): [number, number] => [
    (10 + (1190 / 12) * x + 5) * scale,
    (10 + 60 * y + 5) * scale,
];

/** Draws the harness root at `scale` on screen, as `transform: scale()` on a parent would. */
function scaled(grid: ReturnType<typeof setup>, scale: number): void {
    const { root } = grid;
    Object.defineProperty(root, "offsetWidth", {
        get: () => 1200,
        configurable: true,
    });
    Object.defineProperty(root, "offsetHeight", {
        configurable: true,
        get: () => grid.view().height,
    });
    root.getBoundingClientRect = () =>
        new DOMRect(0, 0, 1200 * scale, grid.view().height * scale);
}

const layout = () =>
    frozen([
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "b", x: 0, y: 1, w: 2, h: 1 },
    ]);

describe("a grid in a scaled parent", () => {
    it.each([0.5, 1.5])(
        "drags under the pointer at scale %s, with no option",
        (scale) => {
            const grid = setup({ layout: layout() });
            scaled(grid, scale);
            const press = pointer(grid.item("a"), ...at(0, 0, scale));
            press.move(...at(4, 0, scale));
            expect(grid.engine.get("gesture")?.placeholder).toEqual(
                itemPixels(grid.view().geometry ?? ({} as never), {
                    x: 4,
                    y: 0,
                    w: 1,
                    h: 1,
                }),
            );
            // the held item drawn under the pointer, in the root's own pixels
            expect(grid.item("a").style.transform).toBe(
                `translate(${10 + (1190 / 12) * 4}px, 10px)`,
            );
            press.release(...at(4, 0, scale));
            expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
                x: 4,
                y: 0,
            });
        },
    );

    it("resizes under the pointer at scale 0.5", () => {
        const grid = setup({ layout: layout() });
        scaled(grid, 0.5);
        const handle = grid.resizeHandle("b", "end");
        const press = pointer(handle, ...at(1, 1, 0.5));
        press.move(...at(4, 1, 0.5));
        press.release(...at(4, 1, 0.5));
        expect(grid.model.get("item-by", { itemId: "b" })).toMatchObject({
            w: 5,
        });
    });

    it("drops a new item where the pointer is at scale 0.5", () => {
        const grid = setup({ layout: layout() });
        scaled(grid, 0.5);
        const source = grid.source({ item: { w: 1, h: 1 }, itemId: "new" });
        const press = pointer(source, 0, 0);
        // centred under the pointer: the middle of cell (6, 0)
        const centre = (x: number): [number, number] => [
            (10 + (1190 / 12) * x + 45) * 0.5,
            (10 + 25) * 0.5,
        ];
        press.move(...centre(6));
        press.release(...centre(6));
        expect(grid.model.get("item-by", { itemId: "new" })).toMatchObject({
            x: 6,
            y: 0,
        });
    });

    it("takes a given scale over what the box says", () => {
        const grid = setup({ layout: layout(), engine: { scale: 0.5 } });
        // the box says 1: the option wins
        const press = pointer(grid.item("a"), ...at(0, 0, 0.5));
        press.move(...at(3, 0, 0.5));
        press.release(...at(3, 0, 0.5));
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 3,
        });
    });

    it("reads a scale that changed between gestures", () => {
        const grid = setup({ layout: layout() });
        scaled(grid, 0.5);
        let press = pointer(grid.item("a"), ...at(0, 0, 0.5));
        press.move(...at(2, 0, 0.5));
        press.release(...at(2, 0, 0.5));
        scaled(grid, 2);
        press = pointer(grid.item("a"), ...at(2, 0, 2));
        press.move(...at(5, 0, 2));
        press.release(...at(5, 0, 2));
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 5,
        });
    });

    it("finds the cell under a point at the scale shown now, with no gesture or measure", () => {
        const grid = setup({ layout: layout() });
        scaled(grid, 0.5);
        const [clientX, clientY] = at(7, 2, 0.5);
        expect(grid.engine.get("cell-at", { clientX, clientY })).toEqual({
            x: 7,
            y: 2,
        });
    });
});

describe("the grid's cells", () => {
    it("are cols × rows, row by row, each a 1 × 1 item's box there", () => {
        const grid = setup({ layout: layout() });
        const cells = grid.engine.get("cells", { rows: 3 });
        expect(cells).toHaveLength(36);
        expect(cells[13]).toMatchObject({ x: 1, y: 1 });
        const geometry = grid.view().geometry;
        if (!geometry) throw new Error("not measured");
        for (const cell of cells) {
            expect(cell.rect).toEqual(
                itemPixels(geometry, { x: cell.x, y: cell.y, w: 1, h: 1 }),
            );
        }
    });

    it("under `auto`, reach the layout's bottom plus one, the preview's in a gesture", () => {
        const grid = setup({ layout: layout() });
        expect(grid.engine.get("cells", { rows: "auto" })).toHaveLength(36);
        // b (two rows down) dragged to the side of a: the preview is one row tall
        const press = pointer(grid.item("b"), ...at(0, 1));
        press.move(...at(1, 0));
        expect(grid.engine.get("cells", { rows: "auto" })).toHaveLength(24);
        press.cancel();
        flush();
        expect(grid.engine.get("cells", { rows: "auto" })).toHaveLength(36);
    });

    it("are none before the grid is measured", () => {
        const grid = setup({ layout: layout(), width: 0 });
        expect(grid.engine.get("cells", { rows: 2 })).toEqual([]);
    });

    it.each(["ltr", "rtl"] as const)(
        "sit where an item of their cell sits (%s)",
        (dir) => {
            const grid = setup({
                layout: frozen([{ id: "one", x: 5, y: 1, w: 1, h: 1 }]),
                allowOverlap: true,
                dir,
            });
            const view = grid.view();
            const cell = grid.engine
                .get("cells", { rows: 2 })
                .find((each) => each.x === 5 && each.y === 1);
            if (!cell) throw new Error("no cell");
            const part = cellPart(view, cell);
            expect(part.style).toEqual(itemPart(view, "one").style);
            expect(part.attributes).toEqual({
                "data-grid-layout-part": "cell",
                "data-x": "5",
                "data-y": "1",
            });
        },
    );
});
