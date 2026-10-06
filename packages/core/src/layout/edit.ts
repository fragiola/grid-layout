// The layout changes a grid makes, as pure functions: move, resize, add and remove an item, and
// settle. A place or a size goes through the rules' constraints first (K1), compaction last.
// Each returns a layout that is in bounds, never overlapping (unless `allowOverlap`) and
// compacted, and never mutates its input. When nothing changes, or the change is refused (a
// static item, a collision under `preventCollision`), it returns the very same layout.

import { bottom, firstCollision } from "./collision";
import { verticalCompactor } from "./compact";
import {
    type ConstraintEnv,
    constrainMove,
    constrainPlace,
    constrainResize,
} from "./constraints";
import { moveWorking, pushAside } from "./move";
import type { Layout, LayoutItem, LayoutRules, ResizeSide } from "./types";
import {
    fromWorking,
    keepIfSame,
    sameRect,
    toWorking,
    type WorkItem,
} from "./working";

/** An item to add: without `x` and `y` it takes the first free cell, in reading order. */
export type NewLayoutItem = Omit<LayoutItem, "x" | "y"> & {
    readonly x?: number | undefined;
    readonly y?: number | undefined;
};

/**
 * `layout` settled by the rules' compactor; when items may overlap, only by a compactor made for
 * it (`overlap`).
 */
export function compactLayout(layout: Layout, rules: LayoutRules): Layout {
    const compactor = rules.compactor ?? verticalCompactor;
    if (rules.allowOverlap && compactor.overlap !== true) return layout;
    return keepIfSame(layout, compactor.compact(layout, rules.cols));
}

function settle(
    before: Layout,
    work: readonly WorkItem[],
    rules: LayoutRules,
): Layout {
    return keepIfSame(before, compactLayout(fromWorking(work), rules));
}

function moveOptions(rules: LayoutRules) {
    return {
        compactType: (rules.compactor ?? verticalCompactor).type,
        preventCollision: rules.preventCollision === true,
        allowOverlap: rules.allowOverlap === true,
    };
}

/**
 * The item `id` moved to `x`/`y` (through its constraints, kept inside the grid), pushing what it
 * lands on, then settled. A static item never moves; under `preventCollision` a move into an
 * occupied cell is refused. `env` gives pixel constraints the engine's measurements.
 */
export function moveItem(
    layout: Layout,
    id: string,
    x: number,
    y: number,
    rules: LayoutRules,
    env?: ConstraintEnv,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const target = constrainMove(item.source, x, y, rules, layout, env);
    if (
        !moveWorking(work, item, target.x, target.y, true, moveOptions(rules))
    ) {
        return layout;
    }
    return settle(layout, work, rules);
}

/**
 * The item `id` resized to `size` from `side` (the opposite edge stays put, its constraints hold:
 * by default its limits and the grid's bounds), pushing what it grows into, then settled. Under
 * `preventCollision` a resize into an occupied cell is refused.
 */
export function resizeItem(
    layout: Layout,
    id: string,
    size: { w: number; h: number },
    side: ResizeSide,
    rules: LayoutRules,
    env?: ConstraintEnv,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const rect = constrainResize(item.source, side, size, rules, layout, env);
    if (sameRect(rect, item)) return layout;
    const options = moveOptions(rules);
    if (
        options.preventCollision &&
        !options.allowOverlap &&
        firstCollision(layout, { id, ...rect }) !== undefined
    ) {
        return layout;
    }
    // The resized item keeps the box its handle gives it: what it now covers is pushed past its
    // far edge, never swapped with it (a move's swap would make the resized item jump).
    item.x = rect.x;
    item.y = rect.y;
    item.w = rect.w;
    item.h = rect.h;
    pushAside(work, item, options);
    return settle(layout, work, rules);
}

/**
 * The item `id` given the box `rect` at once (through its constraints: the size, then the place),
 * pushing what it lands on or grows into, then settled. A move to the same box and size is a
 * move; a new size in the same place grows from the bottom-end, as a resize from there does.
 */
export function placeItem(
    layout: Layout,
    id: string,
    rect: { x: number; y: number; w: number; h: number },
    rules: LayoutRules,
    env?: ConstraintEnv,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const box = constrainPlace(item.source, rect, rules, layout, env);
    if (sameRect(box, item)) return layout;
    const options = moveOptions(rules);
    if (
        options.preventCollision &&
        !options.allowOverlap &&
        firstCollision(layout, { id, ...box }) !== undefined
    ) {
        return layout;
    }
    item.w = box.w;
    item.h = box.h;
    if (!moveWorking(work, item, box.x, box.y, true, options))
        pushAside(work, item, options);
    return settle(layout, work, rules);
}

/** The first cell, in reading order, where an item of `w` × `h` overlaps nothing. */
export function firstFreeCell(
    layout: Layout,
    size: { w: number; h: number },
    cols: number,
): { x: number; y: number } {
    const w = Math.min(size.w, cols);
    const last = bottom(layout);
    for (let y = 0; y < last; y++) {
        for (let x = 0; x + w <= cols; x++) {
            if (
                firstCollision(layout, { id: "", x, y, w, h: size.h }) ===
                undefined
            ) {
                return { x, y };
            }
        }
    }
    return { x: 0, y: last };
}

/**
 * `layout` with `item` added at its `x`/`y`, pushing what is there (or at the first free cell
 * when it names none), then settled. Its size, then its place, go through its constraints.
 */
export function addItem(
    layout: Layout,
    item: NewLayoutItem,
    rules: LayoutRules,
    env?: ConstraintEnv,
): Layout {
    // sized from the grid's corner (the whole grid is its room), then placed
    const at = { ...item, x: 0, y: 0 };
    const { w, h } = constrainResize(
        at,
        "bottom-end",
        item,
        rules,
        layout,
        env,
    );
    const cell =
        item.x === undefined || item.y === undefined
            ? firstFreeCell(layout, { w, h }, rules.cols)
            : { x: item.x, y: item.y };
    const wanted = constrainMove(
        { ...at, w, h },
        cell.x,
        cell.y,
        rules,
        layout,
        env,
    );
    if (item.static || rules.allowOverlap) {
        // a static takes its cell, below any static already there, and the others settle around
        // it (as normalisation separates statics)
        let placed: LayoutItem = { ...item, ...wanted, w, h };
        if (item.static && !rules.allowOverlap) {
            const statics = layout.filter((entry) => entry.static);
            while (firstCollision(statics, placed) !== undefined) {
                placed = { ...placed, y: placed.y + 1 };
            }
        }
        return compactLayout([...layout, placed], rules);
    }
    // the new item starts below everything, then moves in like a dropped one
    const work = toWorking([
        ...layout,
        { ...item, x: wanted.x, y: bottom(layout), w, h },
    ]);
    const added = work[work.length - 1];
    if (added !== undefined) {
        moveWorking(work, added, wanted.x, wanted.y, true, moveOptions(rules));
    }
    return compactLayout(fromWorking(work), rules);
}

/** `layout` without the item `id`, settled. */
export function removeItem(
    layout: Layout,
    id: string,
    rules: LayoutRules,
): Layout {
    const rest = layout.filter((item) => item.id !== id);
    return rest.length === layout.length ? layout : compactLayout(rest, rules);
}
