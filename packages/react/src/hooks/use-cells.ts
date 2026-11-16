import {
    type CellRows,
    type CellState,
    cellPart,
    cellRowCount,
} from "@fragiola/grid-layout";
import type * as React from "react";
import { useMemo } from "react";
import { useGridLayoutContext, useViewContext } from "../context";

/** A cell's state and the props to spread onto its element. */
export interface CellHookResult {
    readonly state: CellState;
    readonly props: {
        readonly style: React.CSSProperties;
        readonly [attribute: `data-${string}`]: string;
    };
}

/**
 * The grid's cells (K6), row by row: `rows` of them, or with `auto` the layout's bottom (the
 * preview's during a gesture) plus one. Each is placed as a 1 × 1 item there: what a grid
 * background draws. None before the root is measured.
 */
export function useCells(rows: CellRows = "auto"): readonly CellHookResult[] {
    const { engine } = useGridLayoutContext("useCells");
    const view = useViewContext("useCells");
    const count = cellRowCount(view, rows);
    const geometry = view.geometry;
    // made again only when the cells move: a gesture that keeps the rows renders none
    // biome-ignore lint/correctness/useExhaustiveDependencies: the view's values the cells read
    return useMemo(
        () =>
            engine.get("cells", { rows: count }).map((cell) => {
                const part = cellPart(view, cell);
                return {
                    state: part.state,
                    props: {
                        ...part.attributes,
                        style: part.style as React.CSSProperties,
                    },
                };
            }),
        [
            engine,
            count,
            view.dir,
            view.width,
            geometry?.cols,
            geometry?.rowHeight,
            geometry?.gap[0],
            geometry?.gap[1],
            geometry?.padding[0],
            geometry?.padding[1],
        ],
    );
}
