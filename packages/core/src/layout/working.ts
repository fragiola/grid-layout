// The one place layout items are mutable: a working copy the move and compaction algorithms
// update in place, as React Grid Layout's do, and that turns back into a layout where every item
// that did not change is the caller's own object. The caller's layout is never touched.

import type { Layout, LayoutItem } from "./types";

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
    return work.map(({ source, x, y, w, h }) =>
        source.x === x && source.y === y && source.w === w && source.h === h
            ? source
            : { ...source, x, y, w, h },
    );
}
