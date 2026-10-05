// Shared setup for the layout tests: layouts frozen deep, so any mutation of an input throws
// (modules run in strict mode), and React Grid Layout's moveElement / moveElementAwayFromCollision
// replayed on a working copy, for the cases ported from its spec.

import { moveAway, moveWorking } from "../../src/layout/move";
import type { CompactType, Layout, LayoutItem } from "../../src/layout/types";
import { fromWorking, toWorking } from "../../src/layout/working";

/** `items` as a deep-frozen layout. */
export function frozen(items: readonly LayoutItem[]): Layout {
    return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

/** The item `id` of `layout`, or a failure. */
export function get(layout: Layout, id: string): LayoutItem {
    const item = layout.find((entry) => entry.id === id);
    if (item === undefined) throw new Error(`no item "${id}"`);
    return item;
}

/** Each item's `[x, y, w, h]`, by id: compact to compare. */
export function boxes(
    layout: Layout,
): Record<string, [number, number, number, number]> {
    return Object.fromEntries(
        layout.map((item) => [item.id, [item.x, item.y, item.w, item.h]]),
    );
}

/** React Grid Layout's moveElement (no compaction afterwards), on a frozen copy of `layout`. */
export function rawMove(
    layout: readonly LayoutItem[],
    id: string,
    x: number,
    y: number,
    options: {
        compactType: CompactType;
        preventCollision?: boolean;
        allowOverlap?: boolean;
        isUserAction?: boolean;
    },
): Layout {
    const input = frozen(layout);
    const work = toWorking(input);
    const item = work.find((entry) => entry.id === id);
    if (item === undefined) throw new Error(`no item "${id}"`);
    const moved = moveWorking(work, item, x, y, options.isUserAction ?? true, {
        compactType: options.compactType,
        preventCollision: options.preventCollision === true,
        allowOverlap: options.allowOverlap === true,
    });
    return moved ? fromWorking(work) : input;
}

/** React Grid Layout's moveElementAwayFromCollision, on a frozen copy of `layout`. */
export function rawAway(
    layout: readonly LayoutItem[],
    collidesWith: string,
    itemToMove: string,
    isUserAction: boolean,
    compactType: CompactType,
): Layout {
    const work = toWorking(frozen(layout));
    const pusher = work.find((entry) => entry.id === collidesWith);
    const pushed = work.find((entry) => entry.id === itemToMove);
    if (pusher === undefined || pushed === undefined)
        throw new Error("no such items");
    moveAway(work, pusher, pushed, isUserAction, compactType);
    return fromWorking(work);
}
