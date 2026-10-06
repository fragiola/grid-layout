// The layout's vocabulary: items in grid units, the sides an item resizes from, and the
// compaction strategy. Everything here is logical: `x` counts from the inline-start edge, and a
// side is `start`/`end`, never left/right; the engine mirrors for right-to-left.

import type {
    ConstraintRegistry,
    ItemConstraint,
    LayoutConstraint,
} from "./constraints";

/** One item of a layout, in grid units. */
export interface LayoutItem {
    /** the item's id, unique in its layout */
    readonly id: string;
    /** the first column, counted from the inline-start edge */
    readonly x: number;
    /** the first row */
    readonly y: number;
    /** the width, in columns */
    readonly w: number;
    /** the height, in rows */
    readonly h: number;
    /** the smallest width a resize reaches (default 1) */
    readonly minW?: number | undefined;
    /** the largest width a resize reaches (default: the grid's columns) */
    readonly maxW?: number | undefined;
    /** the smallest height a resize reaches (default 1) */
    readonly minH?: number | undefined;
    /** the largest height a resize reaches (default: unbounded) */
    readonly maxH?: number | undefined;
    /** never moved, by a person or by compaction; others flow around it */
    readonly static?: boolean | undefined;
    /** overrides the grid's `draggable` for this item */
    readonly draggable?: boolean | undefined;
    /** overrides the grid's `resizable` for this item */
    readonly resizable?: boolean | undefined;
    /** its own constraints, after the grid's: names the model's registry holds (K3) */
    readonly constraints?: readonly ItemConstraint[] | undefined;
}

/** A layout: its items, in the order the app gave them. */
export type Layout = readonly LayoutItem[];

/** An item's place and size, in grid units. */
export interface GridRect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/** The side or corner an item is resized from: logical, so it reads the same in RTL. */
export type ResizeSide =
    | "top"
    | "bottom"
    | "start"
    | "end"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";

/** Every resize side, edges first, then corners. */
export const RESIZE_SIDES: readonly ResizeSide[] = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
];

/**
 * How collisions push items aside: `vertical` pushes down, `horizontal` pushes toward the end,
 * `none` keeps items where they are put (pushing down only what would overlap). A custom
 * compactor names one of them for how a move resolves its collisions.
 */
export type CompactType = "vertical" | "horizontal" | "none";

/** How a layout settles after every change: the gaps it closes, and how. */
export interface Compactor {
    /** how a move pushes the items it collides with */
    readonly type: CompactType;
    /** it is made for a grid with `allowOverlap`, which runs it (and skips any other compactor) */
    readonly overlap?: boolean | undefined;
    /**
     * The layout settled: same items, same order, none overlapping (statics never move). Never
     * mutates its input.
     */
    compact(layout: Layout, cols: number): Layout;
}

/** What a layout change obeys besides the items' own limits. */
export interface LayoutRules {
    /** the grid's columns */
    readonly cols: number;
    /** the rows a gesture may reach (default: unbounded) */
    readonly maxRows?: number | undefined;
    /** how the layout settles after a change (default: {@link verticalCompactor}) */
    readonly compactor?: Compactor | undefined;
    /** a move or resize into an occupied cell is refused instead of pushing */
    readonly preventCollision?: boolean | undefined;
    /** items may overlap: nothing is pushed and nothing settles */
    readonly allowOverlap?: boolean | undefined;
    /** what every place and size passes through (default: `gridBounds`, then `minMaxSize`) */
    readonly constraints?: readonly LayoutConstraint[] | undefined;
    /** the constraints items name in their own `constraints` */
    readonly constraintRegistry?: ConstraintRegistry | undefined;
}
