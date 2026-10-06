import { firstCollision } from "@fragiola/grid-layout-react";
import {
    createCompactor,
    type SettleContext,
    type SettlingItem,
} from "@fragiola/grid-layout-react/compactors";

/** The first item already placed that `item` would cover at column `x`, if any. */
function hitAt(item: SettlingItem, x: number, context: SettleContext) {
    return firstCollision(context.placed, { ...item, x });
}

/**
 * Gravity toward the start: each item slides toward column 0 on its own row while nothing is in
 * the way. `createCompactor` calls `settle` once per item in reading order (`"row"`), with the
 * statics and the items before it already placed, and `"horizontal"` is how a drop pushes what it
 * lands on: sideways.
 */
export const gravityCompactor = createCompactor(
    "horizontal",
    "row",
    (item, context) => {
        // a taller item that slid in from a row above may cover this one's place: step past what
        // is there, to the next row when this one runs out
        for (
            let hit = hitAt(item, item.x, context);
            hit !== undefined;
            hit = hitAt(item, item.x, context)
        ) {
            item.x = hit.x + hit.w;
            if (item.x + item.w > context.cols) {
                item.x = 0;
                item.y += 1;
            }
        }
        while (item.x > 0 && hitAt(item, item.x - 1, context) === undefined) {
            item.x -= 1;
        }
    },
);
