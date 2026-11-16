import {
    type CellRows,
    type CellState,
    cellPart,
    cellRowCount,
} from "@fragiola/grid-layout";
import {
    type ComputedRef,
    type CSSProperties,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import { useGridLayoutContext, useViewContext } from "../context";
import { toStyle } from "../utils/render";

/** A cell's state and the props to bind onto its element. */
export interface CellHookResult {
    readonly state: CellState;
    readonly props: {
        readonly style: CSSProperties;
        readonly [attribute: `data-${string}`]: string;
    };
}

/**
 * The grid's cells (K6), row by row: `rows` of them, or with `auto` the layout's bottom (the
 * preview's during a gesture) plus one. Each is placed as a 1 × 1 item there: what a grid
 * background draws. None before the root is measured.
 */
export function useCells(
    rows: MaybeRefOrGetter<CellRows | undefined> = "auto",
): ComputedRef<readonly CellHookResult[]> {
    const { engine } = useGridLayoutContext("useCells");
    const view = useViewContext("useCells");
    // made again only when the cells move: a gesture that keeps the rows renders none
    let lastKey: string | undefined;
    let last: readonly CellHookResult[] = [];
    return computed(() => {
        const current = view.value;
        const count = cellRowCount(current, toValue(rows) ?? "auto");
        const geometry = current.geometry;
        const key = [
            count,
            current.dir,
            current.width,
            geometry?.cols,
            geometry?.rowHeight,
            geometry?.gap[0],
            geometry?.gap[1],
            geometry?.padding[0],
            geometry?.padding[1],
        ].join(",");
        if (key === lastKey) return last;
        lastKey = key;
        last = engine.get("cells", { rows: count }).map((cell) => {
            const part = cellPart(current, cell);
            return {
                state: part.state,
                props: { ...part.attributes, style: toStyle(part.style) },
            };
        });
        return last;
    });
}
