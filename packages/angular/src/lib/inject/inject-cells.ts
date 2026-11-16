import type { Signal } from "@angular/core";
import type { CellRows, CellState, Part } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";
import { cellsOf } from "../utils/signals";

/**
 * The grid's cells (K6), row by row: `rows` of them, or with `auto` the layout's bottom (the
 * preview's during a gesture) plus one. Each is the core's part (its state, its `data-*`, its
 * structural style), placed as a 1 × 1 item there: what `*gridLayoutCells` renders. None before
 * the root is measured.
 */
export function injectCells(
    rows: CellRows | (() => CellRows | undefined) = "auto",
): Signal<readonly Part<CellState>[]> {
    const context = injectGridLayoutContext("injectCells");
    return cellsOf(context, typeof rows === "function" ? rows : () => rows);
}
