// The layout changes a grid makes, as pure functions: move, resize, add and remove an item, and
// settle. Each returns a layout that is in bounds, never overlapping (unless `allowOverlap`) and
// compacted, and never mutates its input. When nothing changes, or the change is refused (a
// static item, a collision under `preventCollision`), it returns the very same layout.

import { bottom, collides, firstCollision } from "./collision";
import { verticalCompactor } from "./compact";
import { moveWorking, pushAside } from "./move";
import { resizeRect } from "./resize";
import type { Layout, LayoutItem, LayoutRules, ResizeSide } from "./types";
import { fromWorking, toWorking, type WorkItem } from "./working";

/** An item to add: without `x` and `y` it takes the first free cell, in reading order. */
export type NewLayoutItem = Omit<LayoutItem, "x" | "y"> & {
    readonly x?: number | undefined;
    readonly y?: number | undefined;
};

/**
 * `after`, with each item whose geometry did not change replaced by `before`'s own object (by
 * id), and `before` itself when that is every item: "nothing changed" is `===`.
 */
function keepIfSame(before: Layout, after: Layout): Layout {
    const previous = new Map(before.map((item) => [item.id, item]));
    const kept = after.map((item) => {
        const old = previous.get(item.id);
        return old !== undefined &&
            old.x === item.x &&
            old.y === item.y &&
            old.w === item.w &&
            old.h === item.h
            ? old
            : item;
    });
    return before.length === kept.length &&
        before.every((item, index) => item === kept[index])
        ? before
        : kept;
}

/** `layout` settled by the rules' compactor, unless items may overlap. */
export function compactLayout(layout: Layout, rules: LayoutRules): Layout {
    if (rules.allowOverlap) return layout;
    const compactor = rules.compactor ?? verticalCompactor;
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

/** A column and row for an item of `w` × `h`, kept inside the grid. */
function inBounds(
    rules: LayoutRules,
    size: { w: number; h: number },
    x: number,
    y: number,
): { x: number; y: number } {
    const maxRows = rules.maxRows ?? Number.POSITIVE_INFINITY;
    return {
        x: Math.max(0, Math.min(x, rules.cols - size.w)),
        y: Math.max(0, Math.min(y, maxRows - size.h)),
    };
}

/**
 * The item `id` moved to `x`/`y` (kept inside the grid), pushing what it lands on, then settled.
 * A static item never moves; under `preventCollision` a move into an occupied cell is refused.
 */
export function moveItem(
    layout: Layout,
    id: string,
    x: number,
    y: number,
    rules: LayoutRules,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const target = inBounds(rules, item, x, y);
    if (
        !moveWorking(work, item, target.x, target.y, true, moveOptions(rules))
    ) {
        return layout;
    }
    return settle(layout, work, rules);
}

/**
 * The item `id` resized to `size` from `side` (the opposite edge stays put, the item's limits and
 * the grid's bounds hold), pushing what it grows into, then settled. Under `preventCollision` a
 * resize into an occupied cell is refused.
 */
export function resizeItem(
    layout: Layout,
    id: string,
    size: { w: number; h: number },
    side: ResizeSide,
    rules: LayoutRules,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const rect = resizeRect(item.source, side, size, rules);
    if (
        rect.x === item.x &&
        rect.y === item.y &&
        rect.w === item.w &&
        rect.h === item.h
    ) {
        return layout;
    }
    const options = moveOptions(rules);
    if (options.preventCollision && !options.allowOverlap) {
        const target = { id, ...rect };
        if (layout.some((other) => collides(other, target))) return layout;
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
 * The item `id` given the box `rect` at once (kept within its limits and the grid, at that place),
 * pushing what it lands on or grows into, then settled. A move to the same box and size is a
 * move; a new size in the same place grows from the bottom-end, as a resize from there does.
 */
export function placeItem(
    layout: Layout,
    id: string,
    rect: { x: number; y: number; w: number; h: number },
    rules: LayoutRules,
): Layout {
    const work = toWorking(layout);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined || item.static) return layout;
    const maxRows = rules.maxRows ?? Number.POSITIVE_INFINITY;
    const { source } = item;
    const x = Math.max(0, Math.min(rect.x, rules.cols - 1));
    const y = Math.max(0, rect.y);
    const w = Math.max(
        Math.min(rect.w, source.maxW ?? rules.cols, rules.cols - x),
        Math.min(source.minW ?? 1, rules.cols - x),
        1,
    );
    const h = Math.max(
        Math.min(rect.h, source.maxH ?? maxRows, maxRows - y),
        Math.min(source.minH ?? 1, maxRows - y),
        1,
    );
    if (x === item.x && y === item.y && w === item.w && h === item.h)
        return layout;
    const options = moveOptions(rules);
    if (options.preventCollision && !options.allowOverlap) {
        const target = { id, x, y, w, h };
        if (layout.some((other) => collides(other, target))) return layout;
    }
    item.w = w;
    item.h = h;
    if (!moveWorking(work, item, x, y, true, options))
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
 * when it names none), then settled.
 */
export function addItem(
    layout: Layout,
    item: NewLayoutItem,
    rules: LayoutRules,
): Layout {
    const w = Math.min(item.w, rules.cols);
    const size = { w, h: item.h };
    const wanted =
        item.x === undefined || item.y === undefined
            ? firstFreeCell(layout, size, rules.cols)
            : inBounds(rules, size, item.x, item.y);
    if (item.static || rules.allowOverlap) {
        // a static takes its cell and the others settle around it
        return compactLayout([...layout, { ...item, ...wanted, w }], rules);
    }
    // the new item starts below everything, then moves in like a dropped one
    const work = toWorking([
        ...layout,
        { ...item, x: wanted.x, y: bottom(layout), w },
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
