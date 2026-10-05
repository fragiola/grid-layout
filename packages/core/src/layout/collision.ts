// Which items overlap. Two items collide when their boxes overlap: edges that only touch do
// not, and an item never collides with itself (the same id).

import type { GridRect, Layout } from "./types";

type Box = GridRect & { readonly id: string };

/** Whether two items overlap (touching edges do not; an item never collides with itself). */
export function collides(a: Box, b: Box): boolean {
    if (a.id === b.id) return false;
    return (
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
}

/** The first item of `layout`, in its order, that `box` overlaps. */
export function firstCollision<T extends Box>(
    layout: readonly T[],
    box: Box,
): T | undefined {
    for (const item of layout) {
        if (collides(item, box)) return item;
    }
    return undefined;
}

/** Every item of `layout` that `box` overlaps, in the layout's order. */
export function collisions<T extends Box>(layout: readonly T[], box: Box): T[] {
    return layout.filter((item) => collides(item, box));
}

/** The row just below the lowest item (0 for an empty layout). */
export function bottom(layout: readonly GridRect[]): number {
    let max = 0;
    for (const item of layout) max = Math.max(max, item.y + item.h);
    return max;
}

/** Whether any two items of `layout` overlap. */
export function overlaps(layout: Layout): boolean {
    return layout.some((item, index) =>
        layout.slice(index + 1).some((other) => collides(item, other)),
    );
}
