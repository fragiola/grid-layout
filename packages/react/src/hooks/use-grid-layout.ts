import type { GridLayoutContextValue } from "../context";
import type { GridLayoutRef } from "../utils/grid-layout-ref";
import { useGrid } from "./internal";

/** The grid layout's model and engine, inside a `GridLayout.Root`. */
export function useGridLayout(): GridLayoutContextValue;
/** The grid layout's model and engine, from anywhere: `null` until a root holds the ref. */
export function useGridLayout(
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContextValue | null;
export function useGridLayout(
    gridLayoutRef?: GridLayoutRef,
): GridLayoutContextValue | null {
    return useGrid("useGridLayout", gridLayoutRef);
}
