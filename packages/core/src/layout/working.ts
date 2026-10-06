// The one place layout items are mutable: a working copy the move and compaction algorithms
// update in place, as React Grid Layout's do, and that turns back into a layout where every item
// that did not change is the caller's own object. The caller's layout is never touched. The
// orders and the one-item-at-a-time loop the compactors share live here too.

import { bottom } from "./collision";
import type { GridRect, Layout, LayoutItem } from "./types";

/** @internal Whether two boxes have the same place and size. */
export function sameRect(a: GridRect, b: GridRect): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** @internal An item of a working copy: its geometry, mutable, and the item it came from. */
export interface WorkItem {
    readonly id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    readonly static: boolean;
    /** moved during the current operation: a moved item is not pushed again (no loops) */
    moved: boolean;
    readonly source: LayoutItem;
}

/** @internal A working copy of `layout`, in its order. */
export function toWorking(layout: Layout): WorkItem[] {
    return layout.map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        static: item.static === true,
        moved: false,
        source: item,
    }));
}

/**
 * @internal The working copy as a layout: an item whose geometry is unchanged is the original
 * object, a changed one a new object with the original's other fields.
 */
export function fromWorking(work: readonly WorkItem[]): Layout {
    return work.map((item) =>
        sameRect(item, item.source)
            ? item.source
            : { ...item.source, x: item.x, y: item.y, w: item.w, h: item.h },
    );
}

/**
 * @internal `after`, with each item whose geometry did not change replaced by `before`'s own
 * object (by id), and `before` itself when that is every item: "nothing changed" is `===`.
 */
export function keepIfSame(before: Layout, after: Layout): Layout {
    const previous = new Map(before.map((item) => [item.id, item]));
    const kept = after.map((item) => {
        const old = previous.get(item.id);
        return old !== undefined && sameRect(old, item) ? old : item;
    });
    return before.length === kept.length &&
        before.every((item, index) => item === kept[index])
        ? before
        : kept;
}

/** @internal Reading order: by row, then column. */
export const byRowThenColumn = (
    a: { readonly x: number; readonly y: number },
    b: { readonly x: number; readonly y: number },
) => a.y - b.y || a.x - b.x;

/** @internal Column order: by column, then row. */
export const byColumnThenRow = (
    a: { readonly x: number; readonly y: number },
    b: { readonly x: number; readonly y: number },
) => a.x - b.x || a.y - b.y;

/** What a compactor's step reads: the items placed so far, the columns, how low they reach. */
interface Settling {
    /** the statics, then each item already settled */
    readonly placed: WorkItem[];
    readonly cols: number;
    /** the row below the lowest item placed */
    maxY: number;
    readonly hasStatics: boolean;
}

/**
 * @internal `layout` settled one item at a time: statics stay, then every other item, in
 * `order`, goes where `settle` puts it, given the items already placed. The input is never
 * mutated, and an item left in place keeps its object.
 */
export function settleEach(
    layout: Layout,
    cols: number,
    order: (a: WorkItem, b: WorkItem) => number,
    settle: (
        item: WorkItem,
        context: Settling,
        sorted: readonly WorkItem[],
    ) => void,
): Layout {
    const work = toWorking(layout);
    const placed = work.filter((item) => item.static);
    const context: Settling = {
        placed,
        cols,
        maxY: bottom(placed),
        hasStatics: placed.length > 0,
    };
    const sorted = [...work].sort(order);
    for (const item of sorted) {
        if (item.static) continue;
        settle(item, context, sorted);
        context.maxY = Math.max(context.maxY, item.y + item.h);
        placed.push(item);
    }
    return fromWorking(work);
}
