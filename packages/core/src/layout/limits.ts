// An item's size within its own limits and the grid's columns: the one rule normalisation and
// adding share, so an item added and the same item set in a layout get the same size.

/** The sizes an item may take: its own limits (minimums default to 1). */
interface Limits {
    readonly w: number;
    readonly h: number;
    readonly minW?: number | undefined;
    readonly maxW?: number | undefined;
    readonly minH?: number | undefined;
    readonly maxH?: number | undefined;
}

function within(
    size: number,
    min: number | undefined,
    max: number | undefined,
): number {
    return Math.max(Math.min(size, max ?? Number.POSITIVE_INFINITY), min ?? 1);
}

/** `item`'s size brought within its limits, and its width within the grid's `cols`. */
export function fitSize(item: Limits, cols: number): { w: number; h: number } {
    return {
        w: Math.min(within(item.w, item.minW, item.maxW), cols),
        h: within(item.h, item.minH, item.maxH),
    };
}
