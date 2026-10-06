// What a custom compactor needs: the order, the statics fixed first, a working copy whose
// unchanged items keep their objects, and the items already placed to collide with.

import type { Compactor, CompactType, GridRect, Layout } from "../layout/types";
import { fromWorking, toWorking } from "../layout/working";

/** The item a compactor's `settle` moves: its place is writable, the rest is not. */
export interface SettlingItem {
    readonly id: string;
    x: number;
    y: number;
    readonly w: number;
    readonly h: number;
}

/** What a compactor's `settle` reads besides the item. */
export interface SettleContext {
    /** the items already placed (statics first, then the ones before in `order`) */
    readonly placed: readonly (GridRect & { readonly id: string })[];
    readonly cols: number;
}

/**
 * A compactor that settles one item at a time: statics stay, then every other item, in reading
 * order (`row`: by row, then column; `column`: by column, then row), goes where `settle` puts it,
 * given the items already placed. `type` is how a move pushes what it collides with. The input
 * is never mutated, and an item `settle` leaves in place keeps its object.
 */
export function createCompactor(
    type: CompactType,
    order: "row" | "column",
    settle: (item: SettlingItem, context: SettleContext) => void,
): Compactor {
    return {
        type,
        compact(layout: Layout, cols: number): Layout {
            const work = toWorking(layout);
            const placed = work.filter((item) => item.static);
            const sorted = [...work].sort((a, b) =>
                order === "row"
                    ? a.y - b.y || a.x - b.x
                    : a.x - b.x || a.y - b.y,
            );
            const context: SettleContext = { placed, cols };
            for (const item of sorted) {
                if (item.static) continue;
                settle(item, context);
                placed.push(item);
            }
            return fromWorking(work);
        },
    };
}
