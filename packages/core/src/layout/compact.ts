// How a layout settles. The vertical and horizontal compactors follow React Grid Layout's
// (react-grid-layout, src/core/compactors.ts), Copyright (c) 2016 Samuel Reed, under the MIT
// licence (see the root LICENSE): each item, in reading order, rises (or moves toward the start)
// as far as it can, and what it would land on is pushed further first. Statics never move, and
// with statics present the early break of the collision scan is off (react-grid-layout#1309).
// They run on a working copy: no input is mutated. `noCompactor` closes no gap, but pushes down
// what overlaps, so a settled layout never overlaps (React Grid Layout's leaves it as it is).

import { collides, firstCollision } from "./collision";
import type { Compactor } from "./types";
import {
    byColumnThenRow,
    byRowThenColumn,
    settleEach,
    type WorkItem,
} from "./working";

/**
 * Moves `item` to `to` on `axis`, first pushing every later item of `sorted` it would land on
 * further along the same axis, recursively.
 */
function resolveCollision(
    sorted: readonly WorkItem[],
    item: WorkItem,
    to: number,
    axis: "x" | "y",
    hasStatics: boolean,
): void {
    const size = axis === "x" ? "w" : "h";
    // one step along the axis, to find what the move would land on
    item[axis] += 1;
    const index = sorted.indexOf(item);
    for (let i = index + 1; i < sorted.length; i++) {
        const other = sorted[i];
        if (other === undefined || other.static) continue;
        // the sort guarantees nothing further collides, unless statics are scattered in it
        if (!hasStatics && other.y > item.y + item.h) break;
        if (collides(item, other)) {
            resolveCollision(sorted, other, to + item[size], axis, hasStatics);
        }
    }
    item[axis] = to;
}

/** Items rise as far as they can, in reading order: the default. */
export const verticalCompactor: Compactor = {
    type: "vertical",
    compact: (layout, cols) =>
        settleEach(
            layout,
            cols,
            byRowThenColumn,
            (item, { placed, maxY, hasStatics }, sorted) => {
                item.x = Math.max(item.x, 0);
                item.y = Math.min(Math.max(item.y, 0), maxY);
                while (
                    item.y > 0 &&
                    firstCollision(placed, item) === undefined
                ) {
                    item.y--;
                }
                for (
                    let hit = firstCollision(placed, item);
                    hit !== undefined;
                    hit = firstCollision(placed, item)
                ) {
                    resolveCollision(
                        sorted,
                        item,
                        hit.y + hit.h,
                        "y",
                        hasStatics,
                    );
                }
                item.y = Math.max(item.y, 0);
            },
        ),
};

/** Items move toward the start as far as they can, column by column, wrapping to a new row. */
export const horizontalCompactor: Compactor = {
    type: "horizontal",
    compact: (layout, cols) =>
        settleEach(
            layout,
            cols,
            byColumnThenRow,
            (item, { placed, hasStatics }, sorted) => {
                item.x = Math.max(item.x, 0);
                item.y = Math.max(item.y, 0);
                while (
                    item.x > 0 &&
                    firstCollision(placed, item) === undefined
                ) {
                    item.x--;
                }
                for (
                    let hit = firstCollision(placed, item);
                    hit !== undefined;
                    hit = firstCollision(placed, item)
                ) {
                    resolveCollision(
                        sorted,
                        item,
                        hit.x + hit.w,
                        "x",
                        hasStatics,
                    );
                    if (item.x + item.w > cols) {
                        // past the last column: the next row, as far toward the start as it goes
                        item.x = cols - item.w;
                        item.y++;
                        while (
                            item.x > 0 &&
                            firstCollision(placed, item) === undefined
                        ) {
                            item.x--;
                        }
                    }
                }
                item.x = Math.max(item.x, 0);
            },
        ),
};

/** Items stay where they are put; one that overlaps an item before it moves down until clear. */
export const noCompactor: Compactor = {
    type: "none",
    compact: (layout, cols) =>
        settleEach(layout, cols, byRowThenColumn, (item, { placed }) => {
            item.x = Math.max(item.x, 0);
            item.y = Math.max(item.y, 0);
            for (
                let hit = firstCollision(placed, item);
                hit !== undefined;
                hit = firstCollision(placed, item)
            ) {
                item.y = hit.y + hit.h;
            }
        }),
};
