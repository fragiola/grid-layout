import type { GridLayoutRef } from "@fragiola/grid-layout";
import type { ComputedRef } from "vue";
import { type GridLayoutContextValue, useGridLayoutContext } from "../context";
import { useGrid } from "./internal";

/** The grid layout's model and engine, inside a `GridLayout.Root` (they never change). */
export function useGridLayout(): GridLayoutContextValue;
/** The grid layout's model and engine, from anywhere: `null` until a root holds the ref. */
export function useGridLayout(
    gridLayoutRef: GridLayoutRef | undefined,
): ComputedRef<GridLayoutContextValue | null>;
export function useGridLayout(
    ...args: [] | [GridLayoutRef | undefined]
): GridLayoutContextValue | ComputedRef<GridLayoutContextValue | null> {
    if (args.length === 0) return useGridLayoutContext("useGridLayout");
    const [gridLayoutRef] = args;
    return useGrid("useGridLayout", () => gridLayoutRef);
}
