// An item's new box when it is resized from a side or a corner: the opposite edge stays where it
// is. As in React Grid Layout's resizeItemInDirection (react-grid-layout, src/core/position.ts),
// Copyright (c) 2016 Samuel Reed, under the MIT licence (see the root LICENSE), a resize from the
// top keeps the bottom edge (react-grid-layout#2203) and one from the start keeps the end edge,
// and neither passes the grid's first row or column; here in grid units, with the item's limits.

import type { GridRect, LayoutItem, ResizeSide } from "./types";

/** Which edges a side moves: the inline one (`start`, `end`) and the block one (`top`, `bottom`). */
export function sideEdges(side: ResizeSide): {
    inline: "start" | "end" | null;
    block: "top" | "bottom" | null;
} {
    const [first, second] = side.split("-");
    const block = first === "top" || first === "bottom" ? first : null;
    const inline = [first, second].find(
        (part): part is "start" | "end" => part === "start" || part === "end",
    );
    return { inline: inline ?? null, block };
}

/** The edges a side moves, as {@link sideEdges} gives them. */
type SideEdges = ReturnType<typeof sideEdges>;

/**
 * @internal The largest width and height `rect` may take from `edges`, its opposite edges
 * staying put, inside `cols` columns and `rows` rows.
 */
export function roomFor(
    rect: GridRect,
    edges: SideEdges,
    cols: number,
    rows: number,
): { w: number; h: number } {
    return {
        w: edges.inline === "start" ? rect.x + rect.w : cols - rect.x,
        h: edges.block === "top" ? rect.y + rect.h : rows - rect.y,
    };
}

/** @internal `rect` at `w` × `h`, the edges `edges` does not move where they are. */
export function anchor(
    rect: GridRect,
    edges: SideEdges,
    w: number,
    h: number,
): GridRect {
    return {
        x: edges.inline === "start" ? rect.x + rect.w - w : rect.x,
        y: edges.block === "top" ? rect.y + rect.h - h : rect.y,
        w,
        h,
    };
}

/** The limits of one axis: the smallest and largest size, `max` already capped by the room. */
function clampSize(size: number, min: number, max: number): number {
    return Math.max(Math.min(size, max), Math.min(min, max), 1);
}

/**
 * `item` resized to `w` × `h` from `side`: the edges the side does not move stay put, the size
 * stays within the item's `minW`/`maxW`/`minH`/`maxH`, and the box within the grid (`cols`
 * columns, `maxRows` rows). An axis the side does not touch keeps its size.
 */
export function resizeRect(
    item: LayoutItem,
    side: ResizeSide,
    size: { w: number; h: number },
    bounds: { cols: number; maxRows?: number | undefined },
): GridRect {
    const edges = sideEdges(side);
    const { cols } = bounds;
    const maxRows = bounds.maxRows ?? Number.POSITIVE_INFINITY;
    const room = roomFor(item, edges, cols, maxRows);
    const w = edges.inline
        ? clampSize(size.w, item.minW ?? 1, Math.min(item.maxW ?? cols, room.w))
        : item.w;
    const h = edges.block
        ? clampSize(
              size.h,
              item.minH ?? 1,
              Math.min(item.maxH ?? maxRows, room.h),
          )
        : item.h;
    return anchor(item, edges, w, h);
}
