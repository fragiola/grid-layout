// Moving an item and pushing what it lands on out of the way. The algorithm follows React Grid
// Layout's moveElement and moveElementAwayFromCollision (react-grid-layout, src/core/layout.ts),
// Copyright (c) 2016 Samuel Reed, under the MIT licence (see the root LICENSE): statics never
// move, a user's move first tries to put the pushed item above (or before) what pushed it, and
// free mode swaps tightly (#1982). It runs on a working copy, so no input is ever mutated, and in
// free mode a collision React Grid Layout would leave overlapping is pushed down instead.

import { collisions, firstCollision } from "./collision";
import type { CompactType } from "./types";
import { byColumnThenRow, byRowThenColumn, type WorkItem } from "./working";

/** How one move resolves its collisions. */
interface MoveOptions {
    readonly compactType: CompactType;
    readonly preventCollision: boolean;
    readonly allowOverlap: boolean;
}

/**
 * What `item` collides with in `layout`, in the order a move meets them: by row (by column with
 * horizontal compaction), the layout's order among equals. Only the hits are sorted, not the
 * layout: the same order, without sorting every item on each push.
 */
function hitsInOrder(
    layout: readonly WorkItem[],
    item: WorkItem,
    type: CompactType,
): WorkItem[] {
    const hits = collisions(layout, item);
    if (type !== "none") {
        hits.sort(type === "horizontal" ? byColumnThenRow : byRowThenColumn);
    }
    return hits;
}

/**
 * @internal Moves `item` of the working `layout` to `x`/`y` (`undefined` keeps that axis) and
 * pushes what it collides with. Returns false when nothing moved: a static item, the same place,
 * or a collision under `preventCollision` (the item stays where it was).
 */
export function moveWorking(
    layout: WorkItem[],
    item: WorkItem,
    x: number | undefined,
    y: number | undefined,
    isUserAction: boolean,
    options: MoveOptions,
): boolean {
    if (item.static) return false;
    const nextX = x ?? item.x;
    const nextY = y ?? item.y;
    // the same place, both axes given: nothing to do. With an axis left out, the item stays but
    // what it covers is resolved again, as a swap toward the start needs (react-grid-layout#2252)
    if (
        x !== undefined &&
        y !== undefined &&
        nextX === item.x &&
        nextY === item.y
    ) {
        return false;
    }

    const oldX = item.x;
    const oldY = item.y;
    item.x = nextX;
    item.y = nextY;
    item.moved = true;

    // Collisions in the order they would be met: moving up (or toward the start) meets the
    // lower items last, so the order is reversed.
    const hits = hitsInOrder(layout, item, options.compactType);
    const movingBack =
        options.compactType === "vertical"
            ? oldY >= nextY
            : options.compactType === "horizontal"
              ? oldX >= nextX
              : false;
    if (movingBack) hits.reverse();

    if (hits.length > 0 && options.allowOverlap) return true;
    if (hits.length > 0 && options.preventCollision) {
        item.x = oldX;
        item.y = oldY;
        item.moved = false;
        return false;
    }

    for (const hit of hits) {
        if (hit.moved) continue;
        if (hit.static) {
            // a static never moves: the moving item goes around it instead
            moveAway(layout, hit, item, isUserAction, options.compactType);
        } else {
            moveAway(layout, item, hit, isUserAction, options.compactType);
        }
    }
    return true;
}

/**
 * @internal Moves `itemToMove` out of `collidesWith`'s way: above or before it when a user's move
 * leaves room there, otherwise one row down (one column toward the end) and again until it is
 * clear.
 */
export function moveAway(
    layout: WorkItem[],
    collidesWith: WorkItem,
    itemToMove: WorkItem,
    isUserAction: boolean,
    type: CompactType,
): void {
    // wrap-like compaction would resolve horizontally too (react-grid-layout#2252)
    const horizontal = type === "horizontal";
    const vertical = type === "vertical";
    const options: MoveOptions = {
        compactType: type,
        // pushing away from a static must not land on it again
        preventCollision: collidesWith.static,
        allowOverlap: false,
    };

    if (isUserAction) {
        // only the first collision of a user's move tries the room above (or before)
        const probe = {
            id: "",
            x: horizontal
                ? Math.max(collidesWith.x - itemToMove.w, 0)
                : itemToMove.x,
            y: vertical
                ? Math.max(collidesWith.y - itemToMove.h, 0)
                : itemToMove.y,
            w: itemToMove.w,
            h: itemToMove.h,
        };
        const first = firstCollision(layout, probe);
        if (first === undefined) {
            moveWorking(
                layout,
                itemToMove,
                horizontal ? probe.x : undefined,
                vertical ? probe.y : undefined,
                false,
                options,
            );
            return;
        }
        const north = first.y + first.h > collidesWith.y;
        const west = collidesWith.x + collidesWith.w > first.x;
        if (north && vertical) {
            // from the pushed item's own row, not the pusher's (react-grid-layout#2173)
            moveWorking(
                layout,
                itemToMove,
                undefined,
                itemToMove.y + 1,
                false,
                options,
            );
            return;
        }
        if (north && type === "none" && !collidesWith.static) {
            // free mode swaps: the pushed item takes the pusher's row and the pusher sits right
            // below it, so a partial overlap leaves no gap (react-grid-layout#1982)
            const row = itemToMove.y;
            collidesWith.y = row;
            itemToMove.y = row + collidesWith.h;
            return;
        }
        if (west && horizontal) {
            moveWorking(
                layout,
                collidesWith,
                itemToMove.x,
                undefined,
                false,
                options,
            );
            return;
        }
    }

    // One step down (or toward the end), then again until clear. Free mode pushes down too:
    // React Grid Layout leaves the two overlapping there.
    moveWorking(
        layout,
        itemToMove,
        horizontal ? itemToMove.x + 1 : undefined,
        horizontal ? undefined : itemToMove.y + 1,
        false,
        options,
    );
}

/**
 * @internal Pushes every item `item` overlaps past its far edge: below it (or after its end with
 * horizontal compaction), each push pushing further in turn. A resize from the bottom or the end
 * uses it, so the resized item keeps its place whatever the reading order; statics are left to
 * the compaction, which settles the others around them.
 */
export function pushAside(
    layout: WorkItem[],
    item: WorkItem,
    options: MoveOptions,
): void {
    if (options.allowOverlap) return;
    item.moved = true;
    const horizontal = options.compactType === "horizontal";
    for (const hit of hitsInOrder(layout, item, options.compactType)) {
        if (hit.moved || hit.static) continue;
        moveWorking(
            layout,
            hit,
            horizontal ? item.x + item.w : undefined,
            horizontal ? undefined : item.y + item.h,
            false,
            { ...options, preventCollision: false },
        );
    }
}
