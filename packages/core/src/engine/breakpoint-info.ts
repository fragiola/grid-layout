// The active breakpoint as an app reads it (`useBreakpoint`), in every adapter: a key that changes
// only with the three values, so a gesture's preview renders nothing that reads them, and the
// values the key stands for.

import type { GridLayoutModel } from "../model/types";
import type { GridLayoutView } from "./types";

/** The active breakpoint, its columns and the grid's width (0 before it is measured). */
export interface BreakpointInfo {
    readonly breakpoint: string;
    readonly cols: number;
    readonly width: number;
}

/**
 * Adapter-only (an app never calls it): the breakpoint, the columns and the width of a view as one string (empty
 * without a view): it changes only when one of them does.
 */
export function breakpointKey(view: GridLayoutView | undefined): string {
    return view
        ? `${view.breakpoint}\u0000${view.geometry?.cols ?? ""}\u0000${view.width}`
        : "";
}

/**
 * Adapter-only (an app never calls it): what a `breakpointKey` stands for (`undefined` for the empty key); the
 * columns are the model's for the breakpoint before the grid is measured.
 */
export function breakpointInfoOf(
    model: GridLayoutModel,
    key: string,
): BreakpointInfo | undefined {
    if (key === "") return undefined;
    const [name = "", cols, width] = key.split("\u0000");
    return {
        breakpoint: name,
        cols:
            Number(cols) ||
            model.get("cols-by", { breakpoint: name }) ||
            model.get("cols"),
        width: Number(width),
    };
}
