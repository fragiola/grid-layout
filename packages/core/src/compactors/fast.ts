// The fast compactors: one pass behind a "tide" (the lowest free row of each column, or the first
// free column of each row) instead of resolving collisions recursively, for layouts of hundreds or
// thousands of items. They follow React Grid Layout's extras (react-grid-layout,
// src/extras/fastVerticalCompactor.ts and src/extras/fastHorizontalCompactor.ts), Copyright (c)
// 2016 Samuel Reed, under the MIT licence (see the root LICENSE), whose algorithm comes from PR
// #2152 by Morris Brodersen. Unlike them, they work on a copy (an item that does not move keeps its
// object), an item outside the columns stays on its row instead of rising to minus infinity, and
// an item as wide as the grid takes the first row free at the start instead of searching forever.

import { collides } from "../layout/collision";
import type { Compactor, Layout } from "../layout/types";
import {
    byColumnThenRow,
    byRowThenColumn,
    fromWorking,
    toWorking,
    type WorkItem,
} from "../layout/working";

/** Statics first among items at the same cell, so the scan meets them before what they block. */
const staticsFirst = (a: WorkItem, b: WorkItem) =>
    Number(b.static) - Number(a.static);

/** Vertical compaction behind a tide per column; `overlap` leaves overlapping items as they are. */
function riseFast(layout: Layout, cols: number, overlap: boolean): Layout {
    const work = toWorking(layout);
    const sorted = [...work].sort(
        (a, b) => byRowThenColumn(a, b) || staticsFirst(a, b),
    );
    const tide = new Array<number>(Math.max(cols, 0)).fill(0);
    const statics = sorted.filter((item) => item.static);
    let passed = 0;
    for (const item of sorted) {
        const end = Math.min(item.x + item.w, cols);
        if (item.static) {
            passed++;
        } else {
            let gap = Number.POSITIVE_INFINITY;
            for (let x = Math.max(item.x, 0); x < end; x++) {
                gap = Math.min(gap, item.y - (tide[x] ?? 0));
            }
            // outside the columns there is no tide to rise to
            if (gap === Number.POSITIVE_INFINITY) gap = 0;
            if (!overlap || gap > 0) item.y -= gap;
            for (let j = passed; !overlap && j < statics.length; j++) {
                const fixed = statics[j];
                if (fixed === undefined) continue;
                // sorted by row: nothing further down can be hit
                if (fixed.y >= item.y + item.h) break;
                if (collides(item, fixed)) {
                    item.y = fixed.y + fixed.h;
                    // moved down: the statics passed over may be hit now
                    if (j > passed) j = passed;
                }
            }
        }
        const reach = item.y + item.h;
        for (let x = Math.max(item.x, 0); x < end; x++) {
            if ((tide[x] ?? 0) < reach) tide[x] = reach;
        }
    }
    return fromWorking(work);
}

/** The first free column over rows `y` to `y + h`. */
function tideOver(tide: readonly number[], y: number, h: number): number {
    let max = 0;
    for (let row = y; row < y + h; row++) max = Math.max(max, tide[row] ?? 0);
    return max;
}

/** Raises the tide over rows `y` to `y + h` to `to`. */
function raise(tide: number[], y: number, h: number, to: number): void {
    for (let row = y; row < y + h; row++) {
        if ((tide[row] ?? 0) < to) tide[row] = to;
    }
}

/** Horizontal compaction behind a tide per row, wrapping to the next row when a row is full. */
function sweepFast(layout: Layout, cols: number, overlap: boolean): Layout {
    if (layout.length === 0) return layout;
    const work = toWorking(layout);
    const sorted = [...work].sort(
        (a, b) => byColumnThenRow(a, b) || staticsFirst(a, b),
    );
    const tide: number[] = [];
    const statics = sorted.filter((item) => item.static);
    // a layout that cannot fit (statics everywhere) ends somewhere instead of looping
    const limit = Math.max(10_000, work.length * 100);
    // the static furthest toward the end that `item` at `x`/`y` would cover (no allocation)
    const blockedTo = (item: WorkItem, x: number, y: number) => {
        let right: number | undefined;
        for (const fixed of statics) {
            if (
                x < fixed.x + fixed.w &&
                x + item.w > fixed.x &&
                y < fixed.y + fixed.h &&
                y + item.h > fixed.y
            ) {
                right = Math.max(right ?? 0, fixed.x + fixed.w);
            }
        }
        return right;
    };
    for (const item of sorted) {
        if (item.static) {
            raise(tide, item.y, item.h, item.x + item.w);
            continue;
        }
        let y = Math.max(item.y, 0);
        let x = 0;
        for (;;) {
            x = tideOver(tide, y, item.h);
            // an item as wide as the grid fits only at the start
            const fits = x + item.w <= cols || x === 0;
            if (fits) {
                const right = overlap ? undefined : blockedTo(item, x, y);
                if (right === undefined) break;
                x = right;
                if (
                    (x + item.w <= cols || x === 0) &&
                    blockedTo(item, x, y) === undefined
                ) {
                    break;
                }
            }
            y++;
            if (y > limit) {
                x = 0;
                break;
            }
        }
        item.x = x;
        item.y = y;
        raise(tide, y, item.h, x + item.w);
    }
    return fromWorking(work);
}

/** Items rise as far as they can, in one pass: React Grid Layout's vertical result, faster. */
export const fastVerticalCompactor: Compactor = {
    type: "vertical",
    compact: (layout, cols) => riseFast(layout, cols, false),
};

/** {@link fastVerticalCompactor} for a grid whose items may overlap (`allowOverlap`). */
export const fastVerticalOverlapCompactor: Compactor = {
    type: "vertical",
    overlap: true,
    compact: (layout, cols) => riseFast(layout, cols, true),
};

/** Items move toward the start in one pass, wrapping to the next row when one is full. */
export const fastHorizontalCompactor: Compactor = {
    type: "horizontal",
    compact: (layout, cols) => sweepFast(layout, cols, false),
};

/** {@link fastHorizontalCompactor} for a grid whose items may overlap (`allowOverlap`). */
export const fastHorizontalOverlapCompactor: Compactor = {
    type: "horizontal",
    overlap: true,
    compact: (layout, cols) => sweepFast(layout, cols, true),
};
