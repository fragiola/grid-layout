// Grid units to pixels and back. The arithmetic follows React Grid Layout's
// (react-grid-layout, src/core/calculate.ts), Copyright (c) 2016 Samuel Reed, under the MIT
// licence (see the root LICENSE), including its margin consistency (PR #2150): rounding never
// makes the gap between two neighbours differ from `gap`. Offsets are logical: `left` counts from
// the inline-start edge, and the engine mirrors it for right-to-left.

/** The grid's measurements: what places an item in pixels. */
export interface GridGeometry {
    /** the container's content width, in pixels */
    readonly width: number;
    /** the columns */
    readonly cols: number;
    /** one row's height, in pixels */
    readonly rowHeight: number;
    /** the space between items, `[inline, block]`, in pixels */
    readonly gap: readonly [number, number];
    /** the space between the container's edge and the items, `[inline, block]`, in pixels */
    readonly padding: readonly [number, number];
}

/** A box in pixels, from the container's inline-start and top edges. */
export interface PixelRect {
    /** from the container's inline-start edge */
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

/** One column's width, in pixels. */
export function columnWidth(geometry: GridGeometry): number {
    const { width, cols, gap, padding } = geometry;
    return (width - gap[0] * (cols - 1) - padding[0] * 2) / cols;
}

/** The pixel size of `units` columns (or rows) of `size` pixels with `gap` between them. */
function span(units: number, size: number, gap: number): number {
    return Math.round(size * units + Math.max(0, units - 1) * gap);
}

/**
 * Where an item at `rect` (grid units) sits, in pixels. Its width and height absorb the rounding,
 * so the gap to the next column (row) is exactly `gap`.
 */
export function itemPixels(
    geometry: GridGeometry,
    rect: { x: number; y: number; w: number; h: number },
): PixelRect {
    const { rowHeight, gap, padding } = geometry;
    const colWidth = columnWidth(geometry);
    const left = Math.round((colWidth + gap[0]) * rect.x + padding[0]);
    const top = Math.round((rowHeight + gap[1]) * rect.y + padding[1]);
    const nextLeft = Math.round(
        (colWidth + gap[0]) * (rect.x + rect.w) + padding[0],
    );
    const nextTop = Math.round(
        (rowHeight + gap[1]) * (rect.y + rect.h) + padding[1],
    );
    // the margin consistency: a neighbour starts exactly `gap` after this item ends
    const width = Math.max(0, nextLeft - gap[0] - left);
    const height = Math.max(0, nextTop - gap[1] - top);
    return { left, top, width, height };
}

/** The column and row nearest to a pixel position, not clamped. */
export function cellAt(
    geometry: GridGeometry,
    left: number,
    top: number,
): { x: number; y: number } {
    const { rowHeight, gap, padding } = geometry;
    return {
        x: Math.round((left - padding[0]) / (columnWidth(geometry) + gap[0])),
        y: Math.round((top - padding[1]) / (rowHeight + gap[1])),
    };
}

/** The columns and rows nearest to a pixel size, at least one of each, not clamped otherwise. */
export function unitsAt(
    geometry: GridGeometry,
    width: number,
    height: number,
): { w: number; h: number } {
    const { rowHeight, gap } = geometry;
    return {
        w: Math.max(
            1,
            Math.round((width + gap[0]) / (columnWidth(geometry) + gap[0])),
        ),
        h: Math.max(1, Math.round((height + gap[1]) / (rowHeight + gap[1]))),
    };
}

/** The container's height for `rows` rows: the rows, the gaps between them and the padding. */
export function containerHeight(geometry: GridGeometry, rows: number): number {
    const { rowHeight, gap, padding } = geometry;
    if (rows <= 0) return padding[1] * 2;
    return span(rows, rowHeight, gap[1]) + padding[1] * 2;
}
