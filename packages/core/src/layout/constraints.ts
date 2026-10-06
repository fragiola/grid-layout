// Pluggable constraints: rules on where an item may go and what size it may take, applied by every
// command that places or sizes an item (K1). The interface and the built-ins follow React Grid
// Layout's (react-grid-layout, src/core/constraints.ts and rfcs/0002-pluggable-constraints.md),
// Copyright (c) 2016 Samuel Reed, under the MIT licence (see the root LICENSE): the grid's
// constraints run first, then the item's own, each on what the one before gave. Unlike it, a
// constraint receives the item with the proposed place or size already in it, `aspectRatio` and
// `containerBounds` count the grid's padding, a factory given bad values returns a constraint that
// says why (`invalid`) instead of throwing, and what the constraints give is kept inside the
// columns afterwards: a committed layout is always valid.

import { columnWidth, type GridGeometry, pixelSpan, unitsAt } from "./geometry";
import { anchor, roomFor, sideEdges } from "./resize";
import type {
    GridRect,
    Layout,
    LayoutItem,
    LayoutRules,
    ResizeSide,
} from "./types";

/** The pixels an engine gives a command (K2): passed per run, never stored in the model. */
export interface ConstraintEnv {
    /** the grid's measurements */
    readonly geometry?: GridGeometry | undefined;
    /** the height the grid shows, in pixels (0 or absent: unknown) */
    readonly height?: number | undefined;
}

/** What a constraint knows besides the item: the grid's rules, the layout, its pixels. */
export interface ConstraintContext {
    readonly cols: number;
    /** the rows a command may ask for (`Infinity`: unbounded) */
    readonly maxRows: number;
    /** the layout the command changes */
    readonly layout: Layout;
    /** the grid's measurements, when an engine runs the command; a `pixels` constraint has them */
    readonly geometry: GridGeometry | undefined;
    /** the height the grid shows, in pixels (0: unknown) */
    readonly height: number;
}

/**
 * A rule on where an item goes (`position`) and what size it takes (`size`). Each receives the
 * item with the proposed place (or size) in it, and returns what it allows.
 */
export interface LayoutConstraint {
    /** its name, for debugging and for what a dry run reports as skipped */
    readonly name: string;
    /**
     * it reads `ctx.geometry`: without an engine's pixels it does what it can (`containerBounds`
     * bounds by `maxRows`, `aspectRatio` nothing), and the command's result names it as skipped
     */
    readonly pixels?: boolean | undefined;
    /** why it can never apply (a factory given bad values): the model refuses it */
    readonly invalid?: string | undefined;
    /** the place `item` (at the proposed `x`/`y`) may take */
    position?(
        item: LayoutItem,
        ctx: ConstraintContext,
    ): { x: number; y: number };
    /** the size `item` (at the proposed `w`/`h`, resized from `side`) may take */
    size?(
        item: LayoutItem,
        ctx: ConstraintContext,
        side: ResizeSide,
    ): { w: number; h: number };
}

/** An argument a layout stores for a constraint factory: plain data, so the layout serialises. */
export type ConstraintArg = string | number | boolean | null;

/**
 * An item's own constraint, as its layout stores it: a name the model's registry holds, with the
 * arguments of a factory (`{ name: "aspectRatio", args: [16 / 9] }`).
 */
export type ItemConstraint =
    | string
    | {
          readonly name: string;
          readonly args?: readonly ConstraintArg[] | undefined;
          /** a layout stores data: never a constraint's rules */
          readonly position?: never;
          readonly size?: never;
      };

/** A constraint factory a registry holds: called with an item constraint's `args`. */
export type ConstraintFactory = (...args: never[]) => LayoutConstraint;

/** The constraints items name, by name: constraints, or factories of one. */
export type ConstraintRegistry = Readonly<
    Record<string, LayoutConstraint | ConstraintFactory>
>;

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

/** The rows the grid's height shows, padding included; `maxRows` when it is unknown. */
function visibleRows(ctx: ConstraintContext): number {
    const { geometry, height } = ctx;
    if (!geometry || height <= 0) return ctx.maxRows;
    const [, gap] = geometry.gap;
    return Math.floor(
        (height - geometry.padding[1] * 2 + gap) / (geometry.rowHeight + gap),
    );
}

/** A box kept inside `cols` columns and `rows` rows. */
function bounded(item: LayoutItem, cols: number, rows: number) {
    return {
        x: clamp(item.x, 0, Math.max(0, cols - item.w)),
        y: clamp(item.y, 0, Math.max(0, rows - item.h)),
    };
}

/** A size kept within the room `side` leaves inside `cols` columns and `rows` rows. */
function sizedWithin(
    item: LayoutItem,
    side: ResizeSide,
    cols: number,
    rows: number,
) {
    const max = roomFor(item, sideEdges(side), cols, rows);
    return {
        w: clamp(item.w, 1, Math.max(1, max.w)),
        h: clamp(item.h, 1, Math.max(1, max.h)),
    };
}

/** Items stay inside the columns and `maxRows`: a default. */
export const gridBounds: LayoutConstraint = {
    name: "gridBounds",
    position: (item, ctx) => bounded(item, ctx.cols, ctx.maxRows),
    size: (item, ctx, side) => sizedWithin(item, side, ctx.cols, ctx.maxRows),
};

/** @internal `item`'s size within its own `minW`/`maxW`/`minH`/`maxH` (minimums default to 1). */
export function withinLimits(item: LayoutItem): { w: number; h: number } {
    return {
        w: clamp(item.w, item.minW ?? 1, item.maxW ?? Number.POSITIVE_INFINITY),
        h: clamp(item.h, item.minH ?? 1, item.maxH ?? Number.POSITIVE_INFINITY),
    };
}

/** Sizes stay within each item's `minW`/`maxW`/`minH`/`maxH` (minimums default to 1): a default. */
export const minMaxSize: LayoutConstraint = {
    name: "minMaxSize",
    size: withinLimits,
};

/** The constraints a grid has unless it names its own: {@link gridBounds}, then {@link minMaxSize}. */
export const defaultConstraints: readonly LayoutConstraint[] = Object.freeze([
    gridBounds,
    minMaxSize,
]);

/**
 * Items stay inside the rows the grid shows (its height, padding included), not `maxRows`: in
 * place of {@link gridBounds}. Needs the engine's pixels; without them, `maxRows` bounds.
 */
export const containerBounds: LayoutConstraint = {
    name: "containerBounds",
    pixels: true,
    position: (item, ctx) => bounded(item, ctx.cols, visibleRows(ctx)),
    size: (item, ctx, side) =>
        sizedWithin(item, side, ctx.cols, visibleRows(ctx)),
};

/** Only the column is bounded: an item may go below `maxRows`. In place of {@link gridBounds}. */
export const boundedX: LayoutConstraint = {
    name: "boundedX",
    position: (item, ctx) => ({
        x: clamp(item.x, 0, Math.max(0, ctx.cols - item.w)),
        y: item.y,
    }),
};

/** Only the row is bounded, by `maxRows` (the columns stay a hard rule). In place of {@link gridBounds}. */
export const boundedY: LayoutConstraint = {
    name: "boundedY",
    position: (item, ctx) => ({
        x: item.x,
        y: clamp(item.y, 0, Math.max(0, ctx.maxRows - item.h)),
    }),
};

/** A constraint that never applies, and says why. */
function invalid(name: string, why: string): LayoutConstraint {
    return { name, invalid: `${name}: ${why}` };
}

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

/**
 * Sizes keep a width-to-height `ratio` in pixels (16 / 9, 1), the height following the width;
 * the gap and the padding count. Needs the engine's pixels.
 */
export function aspectRatio(ratio: number): LayoutConstraint {
    const name = `aspectRatio(${ratio})`;
    if (!isPositive(ratio)) return invalid(name, "the ratio must be positive");
    return {
        name,
        pixels: true,
        size: (item, ctx) => {
            const { geometry } = ctx;
            if (!geometry) return { w: item.w, h: item.h };
            const width = pixelSpan(
                item.w,
                columnWidth(geometry),
                geometry.gap[0],
            );
            return { w: item.w, h: unitsAt(geometry, width, width / ratio).h };
        },
    };
}

/** Places snap to multiples of `stepX` columns and `stepY` rows (default `stepX`). */
export function snapToGrid(stepX: number, stepY = stepX): LayoutConstraint {
    const name = `snapToGrid(${stepX}, ${stepY})`;
    if (!isPositive(stepX) || !isPositive(stepY)) {
        return invalid(name, "the steps must be positive");
    }
    return {
        name,
        position: (item) => ({
            x: Math.round(item.x / stepX) * stepX,
            y: Math.round(item.y / stepY) * stepY,
        }),
    };
}

/** Every item is at least `minW` × `minH`. */
export function minSize(minW: number, minH: number): LayoutConstraint {
    const name = `minSize(${minW}, ${minH})`;
    if (!isPositive(minW) || !isPositive(minH)) {
        return invalid(name, "the sizes must be positive");
    }
    return {
        name,
        size: (item) => ({
            w: Math.max(minW, item.w),
            h: Math.max(minH, item.h),
        }),
    };
}

/** Every item is at most `maxW` × `maxH`. */
export function maxSize(maxW: number, maxH: number): LayoutConstraint {
    const name = `maxSize(${maxW}, ${maxH})`;
    if (!isPositive(maxW) || !isPositive(maxH)) {
        return invalid(name, "the sizes must be positive");
    }
    return {
        name,
        size: (item) => ({
            w: Math.min(maxW, item.w),
            h: Math.min(maxH, item.h),
        }),
    };
}

// ─── resolving and applying ─────────────────────────────────────────────────────────────────

/** What stored constraints resolved to, per registry: a factory runs once per stored constraint. */
const resolved = new WeakMap<object, WeakMap<object, LayoutConstraint>>();

/** An item constraint as a constraint, or why it cannot be one (a name the registry lacks). */
export function resolveConstraint(
    constraint: ItemConstraint,
    registry: ConstraintRegistry | undefined,
): LayoutConstraint | string {
    const name = typeof constraint === "string" ? constraint : constraint.name;
    const entry =
        registry && Object.hasOwn(registry, name) ? registry[name] : undefined;
    if (entry === undefined) return `no constraint "${name}" is registered`;
    if (typeof entry !== "function") return entry;
    const key = typeof constraint === "object" ? constraint : entry;
    // a name with an entry: the registry is there
    const of = registry as ConstraintRegistry;
    let cache = resolved.get(of);
    if (!cache) {
        cache = new WeakMap();
        resolved.set(of, cache);
    }
    const known = cache.get(key);
    if (known) return known;
    const args = typeof constraint === "object" ? (constraint.args ?? []) : [];
    const made = (entry as (...args: readonly ConstraintArg[]) => unknown)(
        ...args,
    );
    if (
        typeof made !== "object" ||
        made === null ||
        typeof (made as LayoutConstraint).name !== "string"
    ) {
        return `the factory "${name}" made no constraint`;
    }
    cache.set(key, made as LayoutConstraint);
    return made as LayoutConstraint;
}

const isArg = (value: unknown) =>
    value === null || ["string", "number", "boolean"].includes(typeof value);

/** Why `constraints` cannot be an item's: not a list of names, or of `{ name, args? }` of plain data. */
export function itemConstraintsShapeProblem(
    constraints: unknown,
): string | undefined {
    if (constraints === undefined) return undefined;
    const ok =
        Array.isArray(constraints) &&
        constraints.every(
            (one: unknown) =>
                typeof one === "string" ||
                (typeof one === "object" &&
                    one !== null &&
                    typeof (one as { name?: unknown }).name === "string" &&
                    ((one as { args?: unknown }).args === undefined ||
                        (Array.isArray((one as { args?: unknown }).args) &&
                            (one as { args: unknown[] }).args.every(isArg)))),
        );
    return ok
        ? undefined
        : "constraints must be a list of names, or of { name, args } with plain arguments";
}

/** Whether two items' stored constraints say the same: by name and arguments. */
export function sameItemConstraints(
    a: readonly ItemConstraint[] | undefined,
    b: readonly ItemConstraint[] | undefined,
): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((one, index) => {
        const other = b[index];
        if (typeof one === "string" || typeof other === "string")
            return one === other;
        const args = one.args ?? [];
        const otherArgs = other?.args ?? [];
        return (
            other !== undefined &&
            one.name === other.name &&
            args.length === otherArgs.length &&
            args.every((arg, at) => arg === otherArgs[at])
        );
    });
}

/** Why `constraints` cannot be a grid's: not an array of constraints, or one is invalid. */
export function constraintsProblem(constraints: unknown): string | undefined {
    if (!Array.isArray(constraints)) return "constraints must be an array";
    for (const constraint of constraints) {
        if (
            typeof constraint !== "object" ||
            constraint === null ||
            typeof constraint.name !== "string"
        ) {
            return "a constraint is an object with a name";
        }
        if (typeof constraint.invalid === "string") return constraint.invalid;
    }
    return undefined;
}

/** Why `item`'s own constraints cannot apply: a name not registered, or an invalid one. */
export function itemConstraintsProblem(
    item: LayoutItem,
    registry: ConstraintRegistry | undefined,
): string | undefined {
    for (const constraint of item.constraints ?? []) {
        const found = resolveConstraint(constraint, registry);
        if (typeof found === "string") return found;
        if (found.invalid !== undefined) return found.invalid;
    }
    return undefined;
}

/** The constraints a change of `item` obeys: the grid's, then the item's own (merged, K1). */
export function constraintsFor(
    rules: LayoutRules,
    item: LayoutItem,
): readonly LayoutConstraint[] {
    const grid = rules.constraints ?? defaultConstraints;
    if (!item.constraints?.length) return grid;
    const own: LayoutConstraint[] = [];
    for (const constraint of item.constraints) {
        const found = resolveConstraint(constraint, rules.constraintRegistry);
        if (typeof found !== "string") own.push(found);
    }
    return [...grid, ...own];
}

/** What constraints read: the rules, the layout, and the engine's pixels when there are some. */
export function contextOf(
    rules: LayoutRules,
    layout: Layout,
    env: ConstraintEnv | undefined,
): ConstraintContext {
    return {
        cols: rules.cols,
        maxRows: rules.maxRows ?? Number.POSITIVE_INFINITY,
        layout,
        geometry: env?.geometry,
        height: env?.height ?? 0,
    };
}

/** Whether a constraint applies: a valid one does (a pixel one does what it can without pixels). */
const usable = (constraint: LayoutConstraint) =>
    constraint.invalid === undefined;

/**
 * The names of the pixel constraints a change of `item` ran without the engine's pixels (a plain
 * `model.run`), among those that `kind` uses: what they could not do, they skipped.
 */
export function skippedConstraints(
    rules: LayoutRules,
    item: LayoutItem,
    env: ConstraintEnv | undefined,
    kind: "position" | "size" | "both",
): string[] {
    if (env?.geometry) return [];
    return constraintsFor(rules, item)
        .filter(
            (constraint) =>
                constraint.pixels === true &&
                ((kind !== "size" && constraint.position !== undefined) ||
                    (kind !== "position" && constraint.size !== undefined)),
        )
        .map((constraint) => constraint.name);
}

/** `rect` resized from `side` to `w` × `h` (rounded), its opposite edges kept, inside the columns. */
function anchored(
    rect: GridRect,
    side: ResizeSide,
    w: number,
    h: number,
    cols: number,
): GridRect {
    const edges = sideEdges(side);
    const room = roomFor(rect, edges, cols, Number.POSITIVE_INFINITY);
    return anchor(
        rect,
        edges,
        clamp(Math.round(w), 1, Math.max(1, room.w)),
        Math.max(1, Math.min(Math.round(h), room.h)),
    );
}

/**
 * Where `item` goes when moved to `x`/`y`: through its constraints, then inside the columns, at
 * row 0 or below (whole cells).
 */
export function constrainMove(
    item: LayoutItem,
    x: number,
    y: number,
    rules: LayoutRules,
    layout: Layout,
    env: ConstraintEnv | undefined,
): { x: number; y: number } {
    const ctx = contextOf(rules, layout, env);
    let place = { x, y };
    for (const constraint of constraintsFor(rules, item)) {
        if (!constraint.position || !usable(constraint)) continue;
        place = constraint.position({ ...item, ...place }, ctx);
    }
    return {
        x: clamp(Math.round(place.x), 0, Math.max(0, rules.cols - item.w)),
        y: Math.max(0, Math.round(place.y)),
    };
}

/**
 * `item`'s box when resized to `size` from `side`: the axis the side does not pull keeps its
 * size, then the constraints (which may change either), the opposite edges staying put and the
 * box inside the columns after each.
 */
export function constrainResize(
    item: LayoutItem,
    side: ResizeSide,
    size: { readonly w: number; readonly h: number },
    rules: LayoutRules,
    layout: Layout,
    env: ConstraintEnv | undefined,
): GridRect {
    const { inline, block } = sideEdges(side);
    const ctx = contextOf(rules, layout, env);
    let box = anchored(
        item,
        side,
        inline ? size.w : item.w,
        block ? size.h : item.h,
        rules.cols,
    );
    for (const constraint of constraintsFor(rules, item)) {
        if (!constraint.size || !usable(constraint)) continue;
        const next = constraint.size({ ...item, ...box }, ctx, side);
        box = anchored(item, side, next.w, next.h, rules.cols);
    }
    return box;
}

/**
 * `item`'s box when given `rect` at once (a move and a resize): the size through the constraints
 * from the box's bottom-end, then the place, inside the columns.
 */
export function constrainPlace(
    item: LayoutItem,
    rect: GridRect,
    rules: LayoutRules,
    layout: Layout,
    env: ConstraintEnv | undefined,
): GridRect {
    const sized = constrainResize(
        {
            ...item,
            x: clamp(rect.x, 0, Math.max(0, rules.cols - 1)),
            y: Math.max(0, rect.y),
        },
        "bottom-end",
        rect,
        rules,
        layout,
        env,
    );
    const place = constrainMove(
        { ...item, w: sized.w, h: sized.h },
        rect.x,
        rect.y,
        rules,
        layout,
        env,
    );
    return { ...place, w: sized.w, h: sized.h };
}
