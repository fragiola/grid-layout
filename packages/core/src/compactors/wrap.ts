// The wrap compactor: items flow like words in a paragraph, in reading order, each in the first
// free cells after the one before, wrapping to the next row at the last column. It follows React
// Grid Layout's (react-grid-layout, src/extras/wrapCompactor.ts), Copyright (c) 2016 Samuel Reed,
// under the MIT licence (see the root LICENSE), whose algorithm comes from PR #1773 by John
// Thomson; a move into an occupied cell resolves horizontally (react-grid-layout#2252). Unlike it,
// an item takes cells that are free for its whole width and height (statics and the items already
// placed), so items taller or wider than one cell never overlap.

import type { Compactor, Layout } from "../layout/types";
import {
    byRowThenColumn,
    fromWorking,
    toWorking,
    type WorkItem,
} from "../layout/working";

/** Whether `item` fits at `x`/`y`: in the columns, on no taken cell. */
function free(
    taken: ReadonlySet<number>,
    item: WorkItem,
    x: number,
    y: number,
    cols: number,
): boolean {
    const w = Math.min(item.w, cols);
    if (x + w > cols) return false;
    for (let row = y; row < y + item.h; row++) {
        for (let column = x; column < x + w; column++) {
            if (taken.has(row * cols + column)) return false;
        }
    }
    return true;
}

/** Marks the cells `item` covers as taken. */
function take(taken: Set<number>, item: WorkItem, cols: number): void {
    for (let row = item.y; row < item.y + item.h; row++) {
        for (
            let column = Math.max(item.x, 0);
            column < item.x + item.w;
            column++
        ) {
            if (column < cols) taken.add(row * cols + column);
        }
    }
}

function flow(layout: Layout, cols: number): Layout {
    if (layout.length === 0) return layout;
    const work = toWorking(layout);
    const sorted = [...work].sort(byRowThenColumn);
    const taken = new Set<number>();
    for (const item of sorted) if (item.static) take(taken, item, cols);
    // the next cell in reading order an item may start at
    let next = 0;
    for (const item of sorted) {
        if (item.static) continue;
        let at = next;
        while (!free(taken, item, at % cols, Math.floor(at / cols), cols)) {
            // past the row's room: the next row's start
            at =
                (at % cols) + Math.min(item.w, cols) > cols
                    ? (Math.floor(at / cols) + 1) * cols
                    : at + 1;
        }
        item.x = at % cols;
        item.y = Math.floor(at / cols);
        take(taken, item, cols);
        next = at + Math.min(item.w, cols);
    }
    return fromWorking(work);
}

/** Items flow in reading order like words, wrapping at the last column; a move reorders them. */
export const wrapCompactor: Compactor = {
    type: "horizontal",
    compact: flow,
};

/** {@link wrapCompactor}'s moves for a grid whose items may overlap: nothing settles. */
export const wrapOverlapCompactor: Compactor = {
    type: "horizontal",
    overlap: true,
    compact: (layout) => layout,
};
