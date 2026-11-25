// Whether two layouts are the same, item by item: what a controlled root compares a new `layout` with,
// in every adapter.

import { sameItemConstraints } from "./constraints";
import type { Layout, LayoutItem } from "./types";

const ITEM_KEYS = [
    "id",
    "x",
    "y",
    "w",
    "h",
    "minW",
    "maxW",
    "minH",
    "maxH",
    "static",
    "draggable",
    "resizable",
    "bounded",
    "constraints",
] as const satisfies readonly (keyof LayoutItem)[];

/** Whether two layouts hold the same items, field by field, in the same order. */
export function sameLayout(a: Layout, b: Layout): boolean {
    return (
        a === b ||
        (a.length === b.length &&
            a.every((item, index) => {
                const other = b[index];
                return (
                    other !== undefined &&
                    ITEM_KEYS.every((key) =>
                        key === "constraints"
                            ? sameItemConstraints(item[key], other[key])
                            : item[key] === other[key],
                    )
                );
            }))
    );
}
