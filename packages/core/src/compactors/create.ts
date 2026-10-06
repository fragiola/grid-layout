// What a custom compactor needs: the order, the statics fixed first, a working copy whose
// unchanged items keep their objects, and the items already placed to collide with.

import type { Compactor, CompactType, GridRect } from "../layout/types";
import {
    byColumnThenRow,
    byRowThenColumn,
    settleEach,
} from "../layout/working";

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
    const sort = order === "row" ? byRowThenColumn : byColumnThenRow;
    return {
        type,
        compact: (layout, cols) => {
            // what `settle` is told: the items placed so far and the columns, nothing internal
            let told: SettleContext | undefined;
            return settleEach(layout, cols, sort, (item, context) => {
                told ??= { placed: context.placed, cols };
                settle(item, told);
            });
        },
    };
}
