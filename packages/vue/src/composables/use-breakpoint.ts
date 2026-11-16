import {
    type BreakpointInfo,
    breakpointInfoOf,
    breakpointKey,
    type GridLayoutRef,
} from "@fragiola/grid-layout";
import { type ComputedRef, computed } from "vue";
import { useExternal } from "../utils/render";
import { useGrid } from "./internal";

/**
 * The grid's breakpoint, its columns and its width, inside a root or (through its
 * `gridLayoutRef`) from anywhere; `undefined` from outside before a root holds the ref.
 */
export function useBreakpoint(): ComputedRef<BreakpointInfo>;
export function useBreakpoint(
    gridLayoutRef: GridLayoutRef | undefined,
): ComputedRef<BreakpointInfo | undefined>;
export function useBreakpoint(
    gridLayoutRef?: GridLayoutRef,
): ComputedRef<BreakpointInfo | undefined> {
    const grid = useGrid("useBreakpoint", () => gridLayoutRef);
    // only these three: a gesture's preview changes elsewhere render nothing here
    const key = useExternal(
        () => grid.value?.engine.adapter.subscribe,
        () => breakpointKey(grid.value?.engine.adapter.getView()),
    );
    return computed(() =>
        grid.value ? breakpointInfoOf(grid.value.model, key.value) : undefined,
    );
}
