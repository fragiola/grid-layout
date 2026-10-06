import { describe, expect, it, vi } from "vitest";
import {
    aspectRatio,
    boundedX,
    boundedY,
    type ConstraintContext,
    type ConstraintRegistry,
    constrainMove,
    constrainPlace,
    constrainResize,
    constraintsFor,
    constraintsProblem,
    containerBounds,
    contextOf,
    defaultConstraints,
    gridBounds,
    itemConstraintsProblem,
    type LayoutConstraint,
    maxSize,
    minMaxSize,
    minSize,
    resolveConstraint,
    skippedConstraints,
    snapToGrid,
} from "../../src/layout/constraints";
import { type GridGeometry, itemPixels } from "../../src/layout/geometry";
import type {
    LayoutItem,
    LayoutRules,
    ResizeSide,
} from "../../src/layout/types";
import { frozen } from "./helpers";

// React Grid Layout's constraint cases (test/spec/constraints-test.ts), ported to our API: a
// constraint receives the item with the proposed place or size in it, sides are logical, and the
// context carries a `GridGeometry` and a `height` instead of a container width, a row height and a
// margin. Each built-in is tested on its own, then through `constrainMove`/`constrainResize`/
// `constrainPlace`, which also keep the result inside the columns (a committed layout is always
// valid). Every input is frozen: a mutation throws.

/** RGL's test grid: 1200 px wide, 12 columns, 30 px rows, a 10 px gap, no padding. */
const geometry = (over: Partial<GridGeometry> = {}): GridGeometry => ({
    width: 1200,
    cols: 12,
    rowHeight: 30,
    gap: [10, 10],
    padding: [0, 0],
    ...over,
});

/** RGL's `createItem`: a frozen 2 × 2 item at the origin. */
const item = (over: Partial<LayoutItem> = {}): LayoutItem =>
    Object.freeze({ id: "test", x: 0, y: 0, w: 2, h: 2, ...over });

/** RGL's `createContext`: 12 columns, unbounded rows, an 800 px high grid. */
const context = (over: Partial<ConstraintContext> = {}): ConstraintContext =>
    Object.freeze({
        cols: 12,
        maxRows: Number.POSITIVE_INFINITY,
        layout: frozen([]),
        geometry: geometry(),
        height: 800,
        ...over,
    });

/** The engine's pixels for the commands. */
const env = { geometry: geometry(), height: 800 };

/** `constraint`'s place for `proposed` (the item at its proposed `x`/`y`). */
function position(
    constraint: LayoutConstraint,
    proposed: LayoutItem,
    ctx: ConstraintContext,
) {
    if (!constraint.position)
        throw new Error(`${constraint.name}: no position`);
    return constraint.position(proposed, ctx);
}

/** `constraint`'s size for `proposed` (the item at its proposed box), resized from `side`. */
function size(
    constraint: LayoutConstraint,
    proposed: LayoutItem,
    ctx: ConstraintContext,
    side: ResizeSide,
) {
    if (!constraint.size) throw new Error(`${constraint.name}: no size`);
    return constraint.size(proposed, ctx, side);
}

/** Moves `x`/`y` by one: an item's own constraint, to see the order constraints run in. */
const plusOne: LayoutConstraint = {
    name: "plusOne",
    position: (proposed) => ({ x: proposed.x + 1, y: proposed.y + 1 }),
    size: (proposed) => ({ w: proposed.w + 1, h: proposed.h + 1 }),
};

const registry: ConstraintRegistry = {
    plusOne,
    boundedX,
    aspectRatio,
    snapToGrid,
};

const rules = (over: Partial<LayoutRules> = {}): LayoutRules => ({
    cols: 12,
    constraintRegistry: registry,
    ...over,
});

const layout = frozen([]);

describe("gridBounds", () => {
    const ctx = context({ maxRows: 10 });

    it("has its name", () => {
        expect(gridBounds.name).toBe("gridBounds");
    });

    it("keeps a place inside the columns and maxRows", () => {
        expect(position(gridBounds, item({ x: 15 }), ctx).x).toBe(10);
        expect(position(gridBounds, item({ y: 15 }), ctx).y).toBe(8);
        expect(position(gridBounds, item({ x: -5, y: -5 }), ctx)).toEqual({
            x: 0,
            y: 0,
        });
    });

    it("keeps a size inside the columns and maxRows", () => {
        const at = { x: 10, y: 8 };
        expect(
            size(gridBounds, item({ ...at, w: 5 }), ctx, "bottom-end").w,
        ).toBe(2);
        expect(
            size(gridBounds, item({ ...at, h: 5 }), ctx, "bottom-end").h,
        ).toBe(2);
        expect(
            size(gridBounds, item({ ...at, w: 0, h: 0 }), ctx, "bottom-end"),
        ).toEqual({ w: 1, h: 1 });
    });

    it("leaves a valid place unchanged", () => {
        expect(position(gridBounds, item({ x: 5, y: 5 }), ctx)).toEqual({
            x: 5,
            y: 5,
        });
    });

    it("bounds a start-side resize by the end edge", () => {
        // x 2, w 3: the end edge is at 5. The proposed box keeps it there, so w 6 starts at -1.
        const proposed = item({ x: -1, y: 0, w: 6, h: 2 });
        for (const side of ["start", "top-start", "bottom-start"] as const) {
            expect(size(gridBounds, proposed, ctx, side).w).toBe(5);
        }
    });

    it("bounds a top-side resize by the bottom edge", () => {
        // y 2, h 3: the bottom edge is at 5. The proposed box keeps it there, so h 6 starts at -1.
        const proposed = item({ x: 0, y: -1, w: 2, h: 6 });
        for (const side of ["top", "top-end", "top-start"] as const) {
            expect(size(gridBounds, proposed, ctx, side).h).toBe(5);
        }
    });

    it("bounds an end-side resize by the start edge", () => {
        const proposed = item({ x: 10, w: 5 });
        for (const side of ["end", "bottom-end"] as const) {
            expect(size(gridBounds, proposed, ctx, side).w).toBe(2);
        }
    });

    it("bounds a bottom-side resize by the top edge", () => {
        const proposed = item({ y: 8, h: 5 });
        for (const side of ["bottom", "bottom-end"] as const) {
            expect(size(gridBounds, proposed, ctx, side).h).toBe(2);
        }
    });
});

describe("minMaxSize", () => {
    const ctx = context();

    it("has its name and no position", () => {
        expect(minMaxSize.name).toBe("minMaxSize");
        expect(minMaxSize.position).toBeUndefined();
    });

    it("keeps a size within the item's minW/maxW/minH/maxH", () => {
        const limits = { minW: 2, maxW: 6, minH: 2, maxH: 4 };
        expect(
            size(
                minMaxSize,
                item({ ...limits, w: 1, h: 1 }),
                ctx,
                "bottom-end",
            ),
        ).toEqual({ w: 2, h: 2 });
        expect(
            size(
                minMaxSize,
                item({ ...limits, w: 10, h: 10 }),
                ctx,
                "bottom-end",
            ),
        ).toEqual({ w: 6, h: 4 });
    });

    it("takes 1 as the minimum when the item names none", () => {
        expect(
            size(minMaxSize, item({ w: 0, h: 0 }), ctx, "bottom-end"),
        ).toEqual({ w: 1, h: 1 });
    });

    it("has no maximum when the item names none", () => {
        expect(
            size(minMaxSize, item({ w: 100, h: 100 }), ctx, "bottom-end"),
        ).toEqual({ w: 100, h: 100 });
    });

    it("leaves the columns to the command, which keeps the width inside them", () => {
        // deviation: RGL's applySizeConstraints([minMaxSize]) gives w 100; the command keeps 12.
        expect(
            constrainResize(
                item(),
                "bottom-end",
                { w: 100, h: 100 },
                rules({ constraints: [minMaxSize] }),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 12, h: 100 });
    });
});

describe("containerBounds", () => {
    // visible rows = floor((390 + 10) / (30 + 10)) = 10
    const ctx = context({ height: 390 });

    it("has its name and needs the engine's pixels", () => {
        expect(containerBounds.name).toBe("containerBounds");
        expect(containerBounds.pixels).toBe(true);
    });

    it("bounds a place by the rows the grid's height shows", () => {
        expect(position(containerBounds, item({ x: 15, y: 15 }), ctx)).toEqual({
            x: 10,
            y: 8,
        });
    });

    it("falls back to maxRows when the height is 0 (an auto-height grid)", () => {
        const auto = context({ maxRows: 10, height: 0 });
        expect(position(containerBounds, item({ x: 15, y: 15 }), auto)).toEqual(
            { x: 10, y: 8 },
        );
    });

    it("falls back to maxRows without the engine's measurements", () => {
        const bare = context({ maxRows: 10, geometry: undefined });
        expect(position(containerBounds, item({ x: 15, y: 15 }), bare)).toEqual(
            { x: 10, y: 8 },
        );
    });

    it("keeps the height inside the visible grid (react-grid-layout#1779)", () => {
        expect(
            size(containerBounds, item({ y: 8, h: 5 }), ctx, "bottom").h,
        ).toBe(2);
    });

    it("keeps the width inside the columns from end sides (react-grid-layout#1779)", () => {
        expect(
            size(containerBounds, item({ x: 10, w: 5 }), ctx, "bottom-end").w,
        ).toBe(2);
    });

    it("falls back to maxRows when the height is 0 (react-grid-layout#1779)", () => {
        const auto = context({ maxRows: 10, height: 0 });
        expect(
            size(containerBounds, item({ y: 8, h: 5 }), auto, "bottom").h,
        ).toBe(2);
    });

    it("leaves a size that fits unchanged (react-grid-layout#1779)", () => {
        expect(
            size(containerBounds, item({ w: 3, h: 4 }), ctx, "bottom-end"),
        ).toEqual({ w: 3, h: 4 });
    });

    it("counts the vertical padding", () => {
        // deviation: RGL ignores the padding and sees 10 rows; (390 - 2 × 10 + 10) / 40 shows 9.
        const padded = context({
            height: 390,
            geometry: geometry({ padding: [0, 10] }),
        });
        expect(position(containerBounds, item({ y: 15 }), padded).y).toBe(7);
        expect(
            size(containerBounds, item({ y: 7, h: 5 }), padded, "bottom").h,
        ).toBe(2);
    });

    it("falls back to maxRows in a command without the engine's pixels, which names it skipped", () => {
        // deviation: RGL always has a container; a plain model run has no pixels, so the
        // constraint bounds by maxRows and the result names it as skipped.
        const bounded = rules({ maxRows: 10, constraints: [containerBounds] });
        expect(
            constrainMove(item(), 15, 15, bounded, layout, undefined),
        ).toEqual({ x: 10, y: 8 });
        expect(
            skippedConstraints(bounded, item(), undefined, "position"),
        ).toEqual(["containerBounds"]);
        expect(
            constrainMove(item(), 15, 15, bounded, layout, {
                geometry: geometry(),
                height: 390,
            }),
        ).toEqual({ x: 10, y: 8 });
    });
});

describe("boundedX", () => {
    const ctx = context({ maxRows: 10 });

    it("has its name", () => {
        expect(boundedX.name).toBe("boundedX");
    });

    it("bounds only the column", () => {
        expect(position(boundedX, item({ x: 15, y: 100 }), ctx)).toEqual({
            x: 10,
            y: 100,
        });
    });

    it("leaves the row free, below maxRows too", () => {
        expect(position(boundedX, item({ x: 5, y: 100 }), ctx)).toEqual({
            x: 5,
            y: 100,
        });
    });

    it("leaves a negative row to the command, which keeps row 0 or below", () => {
        expect(position(boundedX, item({ x: 5, y: -10 }), ctx)).toEqual({
            x: 5,
            y: -10,
        });
        // deviation: RGL lets y -10 through; the command keeps the item at row 0 or below.
        const free = rules({ maxRows: 10, constraints: [boundedX] });
        expect(constrainMove(item(), 5, -10, free, layout, env)).toEqual({
            x: 5,
            y: 0,
        });
        expect(constrainMove(item(), 5, 100, free, layout, env)).toEqual({
            x: 5,
            y: 100,
        });
    });
});

describe("boundedY", () => {
    const ctx = context({ maxRows: 10 });

    it("has its name", () => {
        expect(boundedY.name).toBe("boundedY");
    });

    it("bounds only the row", () => {
        expect(position(boundedY, item({ x: 100, y: 15 }), ctx)).toEqual({
            x: 100,
            y: 8,
        });
    });

    it("leaves the column free, but the command keeps it inside the columns", () => {
        expect(position(boundedY, item({ x: 100, y: 5 }), ctx)).toEqual({
            x: 100,
            y: 5,
        });
        expect(position(boundedY, item({ x: -10, y: 5 }), ctx)).toEqual({
            x: -10,
            y: 5,
        });
        // deviation: RGL lets x 100 and x -10 through; the columns are a hard rule.
        const free = rules({ maxRows: 10, constraints: [boundedY] });
        expect(constrainMove(item(), 100, 5, free, layout, env)).toEqual({
            x: 10,
            y: 5,
        });
        expect(constrainMove(item(), -10, 5, free, layout, env)).toEqual({
            x: 0,
            y: 5,
        });
    });
});

describe("aspectRatio", () => {
    const ctx = context();

    it("names itself after its ratio", () => {
        expect(aspectRatio(16 / 9).name).toBe(`aspectRatio(${16 / 9})`);
    });

    it("keeps a 2:1 ratio in pixels", () => {
        // column 90.83 px; 4 columns 393.33 px; half of it 196.67 px; (196.67 + 10) / 40 ≈ 5 rows
        expect(
            size(aspectRatio(2), item({ w: 4, h: 10 }), ctx, "bottom-end"),
        ).toEqual({ w: 4, h: 5 });
    });

    it("makes a square with a ratio of 1", () => {
        // 5 columns 494.17 px; (494.17 + 10) / 40 ≈ 13 rows
        expect(
            size(aspectRatio(1), item({ w: 5, h: 10 }), ctx, "bottom-end"),
        ).toEqual({ w: 5, h: 13 });
    });

    it("keeps at least one row", () => {
        expect(
            size(aspectRatio(100), item({ w: 1, h: 1 }), ctx, "bottom-end").h,
        ).toBe(1);
    });

    it("has no position", () => {
        expect(aspectRatio(1).position).toBeUndefined();
    });

    it("needs the engine's pixels, and leaves the size alone without them", () => {
        expect(aspectRatio(1).pixels).toBe(true);
        const bare = context({ geometry: undefined });
        expect(
            size(aspectRatio(1), item({ w: 5, h: 10 }), bare, "bottom-end"),
        ).toEqual({ w: 5, h: 10 });
    });

    it("counts the padding", () => {
        // deviation: RGL ignores the padding: 12 columns of a 1200 px grid are 1190 px, 30 rows.
        // With 100 px of padding each side they are 1000 px: (1000 + 10) / 40 ≈ 25 rows.
        const padded = context({
            geometry: geometry({ padding: [100, 0] }),
        });
        expect(
            size(aspectRatio(1), item({ w: 12, h: 1 }), padded, "bottom-end").h,
        ).toBe(25);
    });

    const ratios = [16 / 9, 4 / 3, 1, 2];
    const widths = [480, 768, 1000, 1200, 1920];
    const paddings = [0, 16, 40];

    it("keeps the pixel ratio within 1 px with one-pixel rows, padding or not", () => {
        for (const ratio of ratios) {
            for (const width of widths) {
                for (const pad of paddings) {
                    const fine = geometry({
                        width,
                        rowHeight: 1,
                        gap: [10, 0],
                        padding: [pad, pad],
                    });
                    const fineCtx = context({ geometry: fine });
                    for (let w = 1; w <= 12; w++) {
                        const sized = size(
                            aspectRatio(ratio),
                            item({ w, h: 1 }),
                            fineCtx,
                            "bottom-end",
                        );
                        const px = itemPixels(fine, { x: 0, y: 0, ...sized });
                        expect(
                            Math.abs(px.height - px.width / ratio),
                        ).toBeLessThanOrEqual(1);
                    }
                }
            }
        }
    });

    it("takes the nearest row count to the ratio, padding or not", () => {
        for (const ratio of ratios) {
            for (const width of widths) {
                for (const pad of paddings) {
                    const grid = geometry({ width, padding: [pad, pad] });
                    const gridCtx = context({ geometry: grid });
                    for (let w = 1; w <= 12; w++) {
                        const sized = size(
                            aspectRatio(ratio),
                            item({ w, h: 1 }),
                            gridCtx,
                            "bottom-end",
                        );
                        const px = itemPixels(grid, { x: 0, y: 0, ...sized });
                        // within half a row (30 px + 10 px of gap), and 1 px of rounding
                        expect(
                            Math.abs(px.height - px.width / ratio),
                        ).toBeLessThanOrEqual(21);
                    }
                }
            }
        }
    });
});

describe("snapToGrid", () => {
    const ctx = context();

    it("names itself after its steps", () => {
        expect(snapToGrid(2).name).toBe("snapToGrid(2, 2)");
        expect(snapToGrid(2, 3).name).toBe("snapToGrid(2, 3)");
    });

    it("snaps a place to the nearest multiple of its step", () => {
        expect(position(snapToGrid(2), item({ x: 3, y: 5 }), ctx)).toEqual({
            x: 4,
            y: 6,
        });
        expect(position(snapToGrid(2), item({ x: 1, y: 2 }), ctx)).toEqual({
            x: 2,
            y: 2,
        });
    });

    it("snaps with different column and row steps", () => {
        expect(position(snapToGrid(3, 2), item({ x: 4, y: 3 }), ctx)).toEqual({
            x: 3,
            y: 4,
        });
    });

    it("has no size", () => {
        expect(snapToGrid(2).size).toBeUndefined();
    });
});

describe("minSize and maxSize", () => {
    const ctx = context();

    it("name themselves after their sizes", () => {
        expect(minSize(3, 4).name).toBe("minSize(3, 4)");
        expect(maxSize(6, 8).name).toBe("maxSize(6, 8)");
    });

    it("minSize raises a smaller size and keeps a larger one", () => {
        expect(
            size(minSize(3, 4), item({ w: 1, h: 2 }), ctx, "bottom-end"),
        ).toEqual({ w: 3, h: 4 });
        expect(
            size(minSize(3, 4), item({ w: 5, h: 6 }), ctx, "bottom-end"),
        ).toEqual({ w: 5, h: 6 });
    });

    it("maxSize lowers a larger size and keeps a smaller one", () => {
        expect(
            size(maxSize(6, 8), item({ w: 10, h: 12 }), ctx, "bottom-end"),
        ).toEqual({ w: 6, h: 8 });
        expect(
            size(maxSize(6, 8), item({ w: 4, h: 5 }), ctx, "bottom-end"),
        ).toEqual({ w: 4, h: 5 });
    });
});

describe("a factory given bad values", () => {
    // deviation: RGL's factories throw ("snapToGrid: step values must be positive"); ours return
    // a constraint that says why, which the model refuses.
    const cases: [string, () => LayoutConstraint][] = [
        ["snapToGrid(0)", () => snapToGrid(0)],
        ["snapToGrid(-1)", () => snapToGrid(-1)],
        ["snapToGrid(2, 0)", () => snapToGrid(2, 0)],
        ["snapToGrid(2, -3)", () => snapToGrid(2, -3)],
        ["snapToGrid(NaN)", () => snapToGrid(Number.NaN)],
        ["aspectRatio(0)", () => aspectRatio(0)],
        ["aspectRatio(-1)", () => aspectRatio(-1)],
        ["aspectRatio(Infinity)", () => aspectRatio(Number.POSITIVE_INFINITY)],
        ["minSize(0, 1)", () => minSize(0, 1)],
        ["minSize(1, -1)", () => minSize(1, -1)],
        ["maxSize(0, 1)", () => maxSize(0, 1)],
        ["maxSize(1, NaN)", () => maxSize(1, Number.NaN)],
    ];

    for (const [label, make] of cases) {
        it(`${label} returns an invalid constraint instead of throwing`, () => {
            const constraint = make();
            expect(constraint.invalid).toEqual(expect.any(String));
            expect(constraint.invalid).toContain(constraint.name);
            expect(constraint.position).toBeUndefined();
            expect(constraint.size).toBeUndefined();
            expect(constraintsProblem([constraint])).toBe(constraint.invalid);
        });
    }

    it("an invalid constraint never applies", () => {
        const bad = rules({ constraints: [snapToGrid(0)] });
        expect(constrainMove(item(), 3, 5, bad, layout, env)).toEqual({
            x: 3,
            y: 5,
        });
    });
});

describe("defaultConstraints", () => {
    it("is gridBounds, then minMaxSize", () => {
        expect(defaultConstraints).toEqual([gridBounds, minMaxSize]);
        expect(Object.isFrozen(defaultConstraints)).toBe(true);
    });

    it("applies when the rules name no constraints", () => {
        const limited = item({ x: 10, y: 8, maxW: 5, maxH: 5 });
        expect(
            constrainResize(
                limited,
                "bottom-end",
                { w: 10, h: 10 },
                rules({ maxRows: 10 }),
                layout,
                env,
            ),
        ).toEqual({ x: 10, y: 8, w: 2, h: 2 });
    });
});

describe("constrainMove (RGL's applyPositionConstraints)", () => {
    it("applies the grid's constraints", () => {
        const bounded = rules({ maxRows: 10, constraints: [gridBounds] });
        expect(constrainMove(item(), 15, 15, bounded, layout, env)).toEqual({
            x: 10,
            y: 8,
        });
    });

    it("chains constraints, each on what the one before gave", () => {
        // gridBounds gives (10, 8), then snapToGrid(3) gives (9, 9)
        const chained = rules({
            maxRows: 10,
            constraints: [gridBounds, snapToGrid(3)],
        });
        expect(constrainMove(item(), 15, 15, chained, layout, env)).toEqual({
            x: 9,
            y: 9,
        });
    });

    it("applies the item's own constraints after the grid's", () => {
        const own = item({ constraints: ["plusOne"] });
        expect(
            constrainMove(
                own,
                5,
                5,
                rules({ constraints: [gridBounds] }),
                layout,
                env,
            ),
        ).toEqual({ x: 6, y: 6 });
    });

    it("resolves an item's factory constraint with its arguments", () => {
        const own = item({ constraints: [{ name: "snapToGrid", args: [3] }] });
        expect(constrainMove(own, 4, 4, rules(), layout, env)).toEqual({
            x: 3,
            y: 3,
        });
    });

    it("keeps a place inside the columns, at row 0 or below, with no constraints", () => {
        // deviation: RGL's applyPositionConstraints([]) gives (100, 100) and (-5, -5) back.
        const none = rules({ maxRows: 10, constraints: [] });
        expect(constrainMove(item(), 100, 100, none, layout, env)).toEqual({
            x: 10,
            y: 100,
        });
        expect(constrainMove(item(), -5, -5, none, layout, env)).toEqual({
            x: 0,
            y: 0,
        });
        expect(constrainMove(item(), 5, 5, none, layout, env)).toEqual({
            x: 5,
            y: 5,
        });
    });

    it("skips constraints without a position", () => {
        const sizeOnly = rules({ constraints: [minMaxSize] });
        expect(constrainMove(item(), 5, 5, sizeOnly, layout, env)).toEqual({
            x: 5,
            y: 5,
        });
    });

    it("rounds what the constraints give to whole cells", () => {
        // deviation: RGL returns what the constraints give, fractions included.
        const half: LayoutConstraint = {
            name: "half",
            position: (proposed) => ({ x: proposed.x / 2, y: proposed.y / 2 }),
        };
        expect(
            constrainMove(
                item(),
                5,
                7,
                rules({ constraints: [half] }),
                layout,
                env,
            ),
        ).toEqual({ x: 3, y: 4 });
    });

    it("gives each constraint the item at the proposed place, and the context", () => {
        const seen: [LayoutItem, ConstraintContext][] = [];
        const spy: LayoutConstraint = {
            name: "spy",
            position: (proposed, ctx) => {
                seen.push([proposed, ctx]);
                return proposed;
            },
        };
        const others = frozen([item({ id: "other", x: 4 })]);
        constrainMove(
            item({ x: 1, y: 1 }),
            3,
            4,
            rules({ maxRows: 10, constraints: [spy] }),
            others,
            env,
        );
        expect(seen).toHaveLength(1);
        const [proposed, ctx] = seen[0] ?? [];
        expect(proposed).toMatchObject({ id: "test", x: 3, y: 4, w: 2, h: 2 });
        expect(ctx).toEqual({
            cols: 12,
            maxRows: 10,
            layout: others,
            geometry: env.geometry,
            height: 800,
        });
    });

    it("ignores an item's constraint the registry does not hold", () => {
        const own = item({ constraints: ["nowhere"] });
        expect(constrainMove(own, 5, 5, rules(), layout, env)).toEqual({
            x: 5,
            y: 5,
        });
    });
});

describe("constrainResize (RGL's applySizeConstraints)", () => {
    it("applies the grid's constraints", () => {
        const bounded = rules({ maxRows: 10, constraints: [gridBounds] });
        expect(
            constrainResize(
                item({ x: 10, y: 8 }),
                "bottom-end",
                { w: 10, h: 10 },
                bounded,
                layout,
                env,
            ),
        ).toEqual({ x: 10, y: 8, w: 2, h: 2 });
    });

    it("chains gridBounds and minMaxSize", () => {
        const limited = item({
            x: 10,
            y: 8,
            minW: 1,
            maxW: 5,
            minH: 1,
            maxH: 5,
        });
        expect(
            constrainResize(
                limited,
                "bottom-end",
                { w: 10, h: 10 },
                rules({ maxRows: 10, constraints: defaultConstraints }),
                layout,
                env,
            ),
        ).toEqual({ x: 10, y: 8, w: 2, h: 2 });
    });

    it("applies the item's own constraints after the grid's", () => {
        expect(
            constrainResize(
                item({ constraints: ["plusOne"] }),
                "bottom-end",
                { w: 4, h: 4 },
                rules({ constraints: [gridBounds] }),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 5, h: 5 });
    });

    it("ignores the item's limits with no constraints, but keeps the columns", () => {
        const limited = item({ minW: 3, maxW: 5, minH: 2, maxH: 4 });
        const none = rules({ constraints: [] });
        expect(
            constrainResize(
                limited,
                "bottom-end",
                { w: 10, h: 10 },
                none,
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 10, h: 10 });
        // deviation: RGL's applySizeConstraints([]) gives w 20 back; the columns hold 12.
        expect(
            constrainResize(
                limited,
                "bottom-end",
                { w: 20, h: 10 },
                none,
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 12, h: 10 });
    });

    it("skips constraints without a size", () => {
        expect(
            constrainResize(
                item(),
                "bottom-end",
                { w: 5, h: 5 },
                rules({ constraints: [snapToGrid(2)] }),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 5, h: 5 });
    });

    it("runs containerBounds' size, which leaves a box that fits alone", () => {
        // RGL's case says containerBounds has no size; both have one since #1779.
        expect(
            constrainResize(
                item(),
                "bottom-end",
                { w: 5, h: 5 },
                rules({ constraints: [containerBounds] }),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 5, h: 5 });
    });

    it("gives each constraint the side and the item at the proposed box", () => {
        const seen: [LayoutItem, ResizeSide][] = [];
        const spy: LayoutConstraint = {
            name: "spy",
            size: (proposed, _ctx, side) => {
                seen.push([proposed, side]);
                return proposed;
            },
        };
        constrainResize(
            item({ x: 4, y: 4 }),
            "top-start",
            { w: 5, h: 5 },
            rules({ constraints: [spy] }),
            layout,
            env,
        );
        expect(seen).toHaveLength(1);
        const [proposed, side] = seen[0] ?? [];
        expect(side).toBe("top-start");
        expect(proposed).toMatchObject({ x: 1, y: 1, w: 5, h: 5 });
    });

    it("keeps the end edge from start sides and the bottom edge from top sides", () => {
        const none = rules({ constraints: [] });
        const at = item({ x: 4, y: 4, w: 4, h: 2 });
        expect(
            constrainResize(at, "start", { w: 6, h: 9 }, none, layout, env),
        ).toEqual({ x: 2, y: 4, w: 6, h: 2 });
        expect(
            constrainResize(at, "top", { w: 9, h: 3 }, none, layout, env),
        ).toEqual({ x: 4, y: 3, w: 4, h: 3 });
        expect(
            constrainResize(at, "top-start", { w: 6, h: 3 }, none, layout, env),
        ).toEqual({ x: 2, y: 3, w: 6, h: 3 });
    });

    it("keeps a start or top resize inside the grid: column 0 and row 0 hold", () => {
        const none = rules({ constraints: [] });
        expect(
            constrainResize(
                item({ x: 2, w: 3 }),
                "start",
                { w: 6, h: 2 },
                none,
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 5, h: 2 });
        expect(
            constrainResize(
                item({ y: 2, h: 3 }),
                "top",
                { w: 2, h: 6 },
                none,
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 2, h: 5 });
    });

    it("keeps the size of an axis the side does not pull", () => {
        expect(
            constrainResize(
                item(),
                "end",
                { w: 4, h: 9 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 4, h: 2 });
        expect(
            constrainResize(
                item(),
                "bottom",
                { w: 9, h: 4 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 2, h: 4 });
    });

    it("lets aspectRatio change the height from an end side", () => {
        const ratio = item({
            x: 4,
            y: 10,
            constraints: [{ name: "aspectRatio", args: [2] }],
        });
        expect(
            constrainResize(ratio, "end", { w: 4, h: 2 }, rules(), layout, env),
        ).toEqual({ x: 4, y: 10, w: 4, h: 5 });
        // from the top-start corner, the bottom-end corner stays put
        expect(
            constrainResize(
                ratio,
                "top-start",
                { w: 4, h: 2 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 2, y: 7, w: 4, h: 5 });
    });

    it("skips a pixel constraint without the engine's pixels, and says so", () => {
        const ratio = item({
            constraints: [{ name: "aspectRatio", args: [2] }],
        });
        expect(
            constrainResize(
                ratio,
                "bottom-end",
                { w: 4, h: 2 },
                rules(),
                layout,
                undefined,
            ),
        ).toEqual({ x: 0, y: 0, w: 4, h: 2 });
        expect(skippedConstraints(rules(), ratio, undefined, "size")).toEqual([
            "aspectRatio(2)",
        ]);
    });

    it("rounds what the constraints give to whole cells", () => {
        const half: LayoutConstraint = {
            name: "half",
            size: (proposed) => ({ w: proposed.w / 2, h: proposed.h / 2 }),
        };
        expect(
            constrainResize(
                item(),
                "bottom-end",
                { w: 5, h: 7 },
                rules({ constraints: [half] }),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 3, h: 4 });
    });
});

describe("constraint composition", () => {
    it("gridBounds and minMaxSize together: the stricter wins", () => {
        const limited = item({ x: 10, minW: 1, maxW: 3 });
        expect(
            constrainResize(
                limited,
                "bottom-end",
                { w: 10, h: 2 },
                rules({ maxRows: 10, constraints: [gridBounds, minMaxSize] }),
                layout,
                env,
            ).w,
        ).toBe(2);
    });

    it("without minMaxSize, the item's maxW does not hold", () => {
        expect(
            constrainResize(
                item({ maxW: 3 }),
                "bottom-end",
                { w: 10, h: 2 },
                rules({ maxRows: 10, constraints: [gridBounds] }),
                layout,
                env,
            ).w,
        ).toBe(10);
    });
});

describe("constrainPlace", () => {
    it("sizes, then places, a box inside the grid", () => {
        expect(
            constrainPlace(
                item(),
                { x: 2, y: 1, w: 3, h: 2 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 2, y: 1, w: 3, h: 2 });
        expect(
            constrainPlace(
                item(),
                { x: -2, y: -1, w: 3, h: 2 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 3, h: 2 });
        expect(
            constrainPlace(
                item(),
                { x: 0, y: 0, w: 20, h: 2 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 0, y: 0, w: 12, h: 2 });
    });

    it("sizes from the asked column: a box past the end edge narrows", () => {
        expect(
            constrainPlace(
                item(),
                { x: 10, y: 0, w: 4, h: 2 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 10, y: 0, w: 2, h: 2 });
    });

    it("runs the item's own constraints on both", () => {
        const own = item({
            constraints: [
                { name: "aspectRatio", args: [2] },
                { name: "snapToGrid", args: [2] },
            ],
        });
        expect(
            constrainPlace(
                own,
                { x: 3, y: 3, w: 4, h: 1 },
                rules(),
                layout,
                env,
            ),
        ).toEqual({ x: 4, y: 4, w: 4, h: 5 });
    });
});

describe("skippedConstraints", () => {
    const ratio = item({ constraints: [{ name: "aspectRatio", args: [2] }] });

    it("lists nothing with the engine's pixels", () => {
        expect(skippedConstraints(rules(), ratio, env, "both")).toEqual([]);
    });

    it("lists the pixel constraints the kind of change uses", () => {
        expect(skippedConstraints(rules(), ratio, undefined, "size")).toEqual([
            "aspectRatio(2)",
        ]);
        expect(skippedConstraints(rules(), ratio, undefined, "both")).toEqual([
            "aspectRatio(2)",
        ]);
        expect(
            skippedConstraints(rules(), ratio, undefined, "position"),
        ).toEqual([]);
        const bounded = rules({ constraints: [containerBounds] });
        for (const kind of ["position", "size", "both"] as const) {
            expect(skippedConstraints(bounded, ratio, undefined, kind)).toEqual(
                kind === "position"
                    ? ["containerBounds"]
                    : ["containerBounds", "aspectRatio(2)"],
            );
        }
    });

    it("lists nothing for a grid without pixel constraints", () => {
        expect(skippedConstraints(rules(), item(), undefined, "both")).toEqual(
            [],
        );
    });
});

describe("the registry", () => {
    it("resolves a name to the constraint it holds", () => {
        expect(resolveConstraint("boundedX", registry)).toBe(boundedX);
        expect(resolveConstraint({ name: "boundedX" }, registry)).toBe(
            boundedX,
        );
    });

    it("says when a name is not registered", () => {
        expect(resolveConstraint("nowhere", registry)).toBe(
            'no constraint "nowhere" is registered',
        );
        expect(resolveConstraint("boundedX", undefined)).toEqual(
            expect.any(String),
        );
        // only the registry's own names: not what every object inherits
        expect(resolveConstraint("toString", {})).toEqual(expect.any(String));
    });

    it("calls a factory with the item constraint's arguments", () => {
        const factory = vi.fn((ratio: number) => aspectRatio(ratio));
        const found = resolveConstraint(
            { name: "ratio", args: [2] },
            { ratio: factory },
        );
        expect(factory).toHaveBeenCalledWith(2);
        expect(found).toMatchObject({ name: "aspectRatio(2)" });
    });

    it("caches a factory's constraint per stored object", () => {
        const factory = vi.fn((step: number) => snapToGrid(step));
        const reg = { snap: factory };
        const stored = { name: "snap", args: [2] };
        const first = resolveConstraint(stored, reg);
        expect(resolveConstraint(stored, reg)).toBe(first);
        expect(factory).toHaveBeenCalledTimes(1);
        const other = resolveConstraint({ name: "snap", args: [2] }, reg);
        expect(other).not.toBe(first);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it("calls a factory named by a string once, with no arguments", () => {
        const factory = vi.fn(() => minSize(2, 2));
        const reg = { atLeast: factory };
        const first = resolveConstraint("atLeast", reg);
        expect(resolveConstraint("atLeast", reg)).toBe(first);
        expect(factory).toHaveBeenCalledTimes(1);
        expect(factory).toHaveBeenCalledWith();
    });

    it("says when a factory makes no constraint", () => {
        const reg = {
            broken: (() => null) as unknown as () => LayoutConstraint,
        };
        expect(resolveConstraint("broken", reg)).toBe(
            'the factory "broken" made no constraint',
        );
    });

    it("finds what makes a grid's constraints unusable", () => {
        expect(constraintsProblem(gridBounds)).toEqual(expect.any(String));
        expect(constraintsProblem([{}])).toEqual(expect.any(String));
        expect(constraintsProblem([null])).toEqual(expect.any(String));
        expect(constraintsProblem([gridBounds, aspectRatio(0)])).toBe(
            aspectRatio(0).invalid,
        );
        expect(constraintsProblem([gridBounds, minMaxSize])).toBeUndefined();
        expect(constraintsProblem([])).toBeUndefined();
    });

    it("finds what makes an item's own constraints unusable", () => {
        expect(itemConstraintsProblem(item(), registry)).toBeUndefined();
        expect(
            itemConstraintsProblem(
                item({
                    constraints: [
                        "boundedX",
                        { name: "snapToGrid", args: [2] },
                    ],
                }),
                registry,
            ),
        ).toBeUndefined();
        expect(
            itemConstraintsProblem(
                item({ constraints: ["nowhere"] }),
                registry,
            ),
        ).toBe('no constraint "nowhere" is registered');
        expect(
            itemConstraintsProblem(
                item({ constraints: [{ name: "aspectRatio", args: [0] }] }),
                registry,
            ),
        ).toBe(aspectRatio(0).invalid);
    });

    it("gives the grid's constraints, then the item's own", () => {
        expect(constraintsFor(rules(), item())).toBe(defaultConstraints);
        const grid = [gridBounds];
        expect(constraintsFor(rules({ constraints: grid }), item())).toBe(grid);
        expect(
            constraintsFor(
                rules({ constraints: grid }),
                item({ constraints: ["plusOne", "nowhere", "boundedX"] }),
            ),
        ).toEqual([gridBounds, plusOne, boundedX]);
    });

    it("builds the context from the rules and the engine's pixels", () => {
        expect(contextOf({ cols: 6 }, layout, undefined)).toEqual({
            cols: 6,
            maxRows: Number.POSITIVE_INFINITY,
            layout,
            geometry: undefined,
            height: 0,
        });
        expect(contextOf({ cols: 6, maxRows: 4 }, layout, env)).toEqual({
            cols: 6,
            maxRows: 4,
            layout,
            geometry: env.geometry,
            height: 800,
        });
    });
});

describe("every built-in", () => {
    const builtIns: LayoutConstraint[] = [
        gridBounds,
        minMaxSize,
        containerBounds,
        boundedX,
        boundedY,
        aspectRatio(1),
        snapToGrid(2),
        minSize(1, 1),
        maxSize(10, 10),
    ];

    for (const constraint of builtIns) {
        it(`${constraint.name} has a name, a method, and is valid`, () => {
            expect(constraint.name.length).toBeGreaterThan(0);
            expect(
                typeof constraint.position === "function" ||
                    typeof constraint.size === "function",
            ).toBe(true);
            expect(constraint.invalid).toBeUndefined();
        });
    }
});

describe("edge cases", () => {
    it("puts an item wider and taller than the grid at the origin", () => {
        const ctx = context({ maxRows: 10 });
        expect(
            position(gridBounds, item({ x: 5, y: 5, w: 20, h: 20 }), ctx),
        ).toEqual({ x: 0, y: 0 });
    });

    it("puts an item at column 0 of a grid without columns", () => {
        expect(
            position(gridBounds, item({ x: 5 }), context({ cols: 0 })).x,
        ).toBe(0);
    });

    it("leaves any row with unbounded rows", () => {
        expect(position(gridBounds, item({ y: 1_000_000 }), context()).y).toBe(
            1_000_000,
        );
    });

    it("raises negative values to the smallest place and size", () => {
        const ctx = context();
        expect(position(gridBounds, item({ x: -10, y: -10 }), ctx)).toEqual({
            x: 0,
            y: 0,
        });
        expect(
            size(gridBounds, item({ w: -5, h: -5 }), ctx, "bottom-end"),
        ).toEqual({ w: 1, h: 1 });
    });
});
