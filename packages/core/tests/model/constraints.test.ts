import { describe, expect, it } from "vitest";
import { fastVerticalOverlapCompactor } from "../../src/compactors";
import { noCompactor } from "../../src/layout/compact";
import {
    aspectRatio,
    boundedX,
    containerBounds,
    defaultConstraints,
    gridBounds,
    type LayoutConstraint,
    minMaxSize,
    snapToGrid,
} from "../../src/layout/constraints";
import type { GridGeometry } from "../../src/layout/geometry";
import type { LayoutItem } from "../../src/layout/types";
import { createGridLayoutModel } from "../../src/model/model";
import { frozen } from "../layout/helpers";

// Constraints in the model (K1–K3): grid-level ones from the options and `grid.configure`, an
// item's own by name from the registry, the engine's pixels per run (`env`), never stored.

const geometry: GridGeometry = {
    width: 1210,
    cols: 12,
    rowHeight: 30,
    gap: [10, 10],
    padding: [10, 10],
};
const env = { geometry, height: 0 };

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra: Partial<LayoutItem> = {},
): LayoutItem => ({ id, x, y, w, h, ...extra });

describe("grid-level constraints", () => {
    it("default to gridBounds and minMaxSize, and are what every move and resize passes through", () => {
        const model = createGridLayoutModel({
            maxRows: 4,
            layout: frozen([item("a", 0, 0, 2, 2, { maxW: 3 })]),
        });
        expect(model.state.constraints).toEqual(defaultConstraints);
        // gridBounds: the row is kept within maxRows (clamped, no longer refused)
        expect(
            model.run("item.move", { itemId: "a", x: 0, y: 3 }),
        ).toMatchObject({ ok: true, value: { item: { y: 0 } } });
        // minMaxSize: the size within the item's limits
        expect(
            model.run("item.resize", { itemId: "a", w: 9, h: 2 }),
        ).toMatchObject({ ok: true, value: { item: { w: 3 } } });
    });

    it("keep a cell outside the columns invalid: the columns are a hard rule", () => {
        const model = createGridLayoutModel({
            constraints: [],
            layout: frozen([item("a", 0, 0, 2, 2)]),
        });
        expect(
            model.run("item.move", { itemId: "a", x: 11, y: 0 }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("without minMaxSize, an item's limits no longer bound a resize", () => {
        const model = createGridLayoutModel({
            constraints: [gridBounds],
            layout: frozen([item("a", 0, 0, 2, 2, { maxW: 3 })]),
        });
        expect(
            model.run("item.resize", { itemId: "a", w: 6, h: 2 }),
        ).toMatchObject({ ok: true, value: { item: { w: 6 } } });
    });

    it("without minMaxSize, a later grid.configure leaves an item past its limits as it is", () => {
        const model = createGridLayoutModel({
            constraints: [gridBounds],
            compactor: noCompactor,
            layout: frozen([item("b", 2, 0, 3, 2, { minW: 2, maxW: 4 })]),
        });
        model.run("item.resize", { itemId: "b", w: 7, h: 2 });
        model.run("grid.configure", { settings: { maxRows: 20 } });
        expect(model.get("item-by", { itemId: "b" })).toMatchObject({ w: 7 });
        // with minMaxSize back, the limits hold again
        model.run("grid.configure", {
            settings: { constraints: defaultConstraints },
        });
        expect(model.get("item-by", { itemId: "b" })).toMatchObject({ w: 4 });
    });

    it("boundedX lets an item past maxRows, still inside the columns", () => {
        const model = createGridLayoutModel({
            maxRows: 4,
            compactor: noCompactor,
            constraints: [boundedX, minMaxSize],
            layout: frozen([item("a", 0, 0, 2, 2)]),
        });
        expect(
            model.run("item.move", { itemId: "a", x: 10, y: 8 }),
        ).toMatchObject({ ok: true, value: { item: { x: 10, y: 8 } } });
    });

    it("are changed by grid.configure, which leaves the layouts as they are", () => {
        const model = createGridLayoutModel({
            compactor: noCompactor,
            layout: frozen([item("a", 0, 0, 1, 1)]),
        });
        const layouts = model.state.layouts;
        const snap = snapToGrid(3);
        expect(
            model.run("grid.configure", {
                settings: { constraints: [gridBounds, snap] },
            }),
        ).toMatchObject({ ok: true });
        expect(model.state.constraints).toEqual([gridBounds, snap]);
        expect(model.state.layouts).toBe(layouts);
        expect(
            model.run("item.move", { itemId: "a", x: 2, y: 0 }),
        ).toMatchObject({ ok: true, value: { item: { x: 3 } } });
        // the same list again is no change
        const before = model.state;
        model.run("grid.configure", {
            settings: { constraints: [gridBounds, snap] },
        });
        expect(model.state).toBe(before);
    });

    it("refuse an invalid constraint: a factory given bad values never throws", () => {
        expect(snapToGrid(0).invalid).toMatch(/positive/);
        expect(() =>
            createGridLayoutModel({ constraints: [snapToGrid(-1)] }),
        ).toThrow(/invalid options: snapToGrid\(-1, -1\)/);
        const model = createGridLayoutModel();
        expect(
            model.run("grid.configure", {
                settings: { constraints: [aspectRatio(0)] },
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
        expect(
            model.run("grid.configure", {
                settings: { constraints: "gridBounds" as never },
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });
});

describe("an item's own constraints", () => {
    const registry = { aspectRatio, snapToGrid, boundedX };

    it("are names resolved from the registry, applied after the grid's", () => {
        const model = createGridLayoutModel({
            compactor: noCompactor,
            constraintRegistry: registry,
            layout: frozen([
                item("a", 0, 0, 1, 1, {
                    constraints: [{ name: "snapToGrid", args: [4] }],
                }),
                item("b", 0, 2, 1, 1),
            ]),
        });
        expect(
            model.run("item.move", { itemId: "a", x: 3, y: 0 }),
        ).toMatchObject({ ok: true, value: { item: { x: 4 } } });
        // only its own
        expect(
            model.run("item.move", { itemId: "b", x: 3, y: 2 }),
        ).toMatchObject({ ok: true, value: { item: { x: 3 } } });
    });

    it("refuse a name the registry lacks, in a layout, an added item or a configure", () => {
        expect(() =>
            createGridLayoutModel({
                layout: [item("a", 0, 0, 1, 1, { constraints: ["nope"] })],
            }),
        ).toThrow(/invalid layout: item "a": no constraint "nope"/);
        const model = createGridLayoutModel({
            constraintRegistry: registry,
            layout: frozen([item("a", 0, 0, 1, 1)]),
        });
        for (const result of [
            model.run("layout.set", {
                layout: [item("a", 0, 0, 1, 1, { constraints: ["nope"] })],
            }),
            model.run("item.add", {
                item: item("b", 0, 0, 1, 1, { constraints: ["nope"] }),
            }),
            model.run("item.configure", {
                itemId: "a",
                settings: { constraints: ["nope"] },
            }),
            model.run("item.configure", {
                itemId: "a",
                settings: {
                    constraints: [{ name: "snapToGrid", args: [0] }],
                },
            }),
        ]) {
            expect(result).toMatchObject({
                ok: false,
                error: { code: "invalid_payload" },
            });
        }
    });

    it("are set with item.configure, as data that serialises", () => {
        const model = createGridLayoutModel({
            compactor: noCompactor,
            constraintRegistry: registry,
            layout: frozen([item("a", 0, 0, 1, 1)]),
        });
        const constraints = [{ name: "snapToGrid", args: [2] }] as const;
        expect(
            model.run("item.configure", {
                itemId: "a",
                settings: { constraints },
            }),
        ).toMatchObject({ ok: true, value: { item: { constraints } } });
        expect(JSON.parse(JSON.stringify(model.get("layout")))).toEqual(
            model.get("layout"),
        );
        expect(
            model.run("item.move", { itemId: "a", x: 3, y: 0 }),
        ).toMatchObject({ ok: true, value: { item: { x: 4 } } });
    });
});

describe("the engine's pixels (K2)", () => {
    const video = () =>
        frozen([
            item("v", 0, 0, 4, 1, {
                constraints: [{ name: "aspectRatio", args: [16 / 9] }],
            }),
        ]);

    it("are given per run: a pixel constraint applies with them, and is skipped and told without", () => {
        const model = createGridLayoutModel({
            constraintRegistry: { aspectRatio },
            layout: video(),
        });
        const without = model.check("item.resize", {
            itemId: "v",
            w: 6,
            h: 1,
        });
        expect(without).toMatchObject({
            ok: true,
            value: {
                item: { w: 6, h: 1 },
                skipped: ["aspectRatio(1.7777777777777777)"],
            },
        });
        const withPixels = model.check(
            "item.resize",
            { itemId: "v", w: 6, h: 1 },
            { env },
        );
        expect(withPixels.ok && withPixels.value.skipped).toBe(undefined);
        // 6 columns of 90 px and their gaps: 590 px wide, 331.9 px tall at 16:9, nine rows of 40
        expect(withPixels.ok && withPixels.value.item.h).toBe(9);
        // never stored: the state holds no pixels, and a later plain run skips them again
        expect(JSON.stringify(Object.keys(model.state))).not.toMatch(
            /env|geometry/,
        );
        expect(
            model.run("item.resize", { itemId: "v", w: 6, h: 1 }),
        ).toMatchObject({ ok: true, value: { skipped: [expect.any(String)] } });
    });

    it("say nothing is skipped when no pixel constraint is in play", () => {
        const model = createGridLayoutModel({
            layout: frozen([item("a", 0, 0, 1, 1)]),
        });
        const result = model.run("item.move", { itemId: "a", x: 1, y: 0 });
        expect(result.ok && "skipped" in result.value).toBe(false);
    });

    it("reach the middleware, and a queued command keeps its own", () => {
        const model = createGridLayoutModel({
            constraints: [gridBounds, containerBounds],
            compactor: noCompactor,
            layout: frozen([item("a", 0, 0, 1, 1), item("b", 1, 0, 1, 1)]),
        });
        const seen: unknown[] = [];
        model.use((ctx, next) => {
            seen.push(ctx.env.geometry?.width);
            return next();
        });
        model.subscribe((event) => {
            if (
                event.command === "item.move" &&
                (event.payload as { itemId: string }).itemId === "a"
            ) {
                // queued: it runs right after, with the pixels it was given
                model.run(
                    "item.move",
                    { itemId: "b", x: 1, y: 9 },
                    { env: { geometry, height: 130 } },
                );
            }
        });
        model.run("item.move", { itemId: "a", x: 0, y: 5 });
        expect(seen).toEqual([undefined, 1210]);
        // containerBounds: 130 px tall, 10 px padding, rows of 30 + 10: three rows
        expect(model.get("item-by", { itemId: "b" })).toMatchObject({ y: 2 });
        // without the pixels, it was skipped
        expect(model.get("item-by", { itemId: "a" })).toMatchObject({ y: 5 });
    });

    it("let a custom constraint read the layout and the rules", () => {
        const topHalf: LayoutConstraint = {
            name: "topHalf",
            position: (proposed, ctx) => ({
                x: proposed.x,
                y: Math.min(
                    proposed.y,
                    Math.floor(ctx.maxRows / 2) - proposed.h,
                ),
            }),
        };
        const model = createGridLayoutModel({
            maxRows: 8,
            compactor: noCompactor,
            constraints: [gridBounds, topHalf],
            layout: frozen([item("a", 0, 0, 1, 2)]),
        });
        expect(
            model.run("item.move", { itemId: "a", x: 0, y: 6 }),
        ).toMatchObject({ ok: true, value: { item: { y: 2 } } });
    });
});

describe("what the model refuses", () => {
    it("an item's constraints that are not names or { name, args } of plain data", () => {
        const model = createGridLayoutModel();
        for (const constraints of [
            "boundedX",
            [null],
            [{ name: "x", args: [{}] }],
            [{ args: [1] }],
        ]) {
            expect(
                model.run("item.add", {
                    item: { id: "a", w: 1, h: 1, constraints } as never,
                }),
            ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
        }
    });

    it("a compactor made for overlap on a grid without allowOverlap", () => {
        expect(() =>
            createGridLayoutModel({ compactor: fastVerticalOverlapCompactor }),
        ).toThrow(/needs allowOverlap/);
        const model = createGridLayoutModel({ allowOverlap: true });
        expect(
            model.run("grid.configure", {
                settings: { compactor: fastVerticalOverlapCompactor },
            }),
        ).toMatchObject({ ok: true });
        expect(
            model.run("grid.configure", { settings: { allowOverlap: false } }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });
});
