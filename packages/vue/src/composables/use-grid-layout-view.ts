import type { GridLayoutRef, GridLayoutView } from "@fragiola/grid-layout";
import type { ComputedRef } from "vue";
import { useViewContext } from "../context";
import { useGrid, useViewOf } from "./internal";

/** The view the root renders: sizes, rects, the gesture in progress. */
export function useGridLayoutView(): ComputedRef<GridLayoutView>;
/** The view of the grid a ref holds, from anywhere: `undefined` until a root holds it. */
export function useGridLayoutView(
    gridLayoutRef: GridLayoutRef | undefined,
): ComputedRef<GridLayoutView | undefined>;
export function useGridLayoutView(
    ...args: [] | [GridLayoutRef | undefined]
): ComputedRef<GridLayoutView | undefined> {
    if (args.length === 0) return useViewContext("useGridLayoutView");
    const [gridLayoutRef] = args;
    return useViewOf(useGrid("useGridLayoutView", () => gridLayoutRef));
}
