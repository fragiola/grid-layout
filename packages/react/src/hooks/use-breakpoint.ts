import {
    type BreakpointInfo,
    breakpointInfoOf,
    breakpointKey,
} from "@fragiola/grid-layout";
import { useMemo, useSyncExternalStore } from "react";
import { type GridLayoutRef, noSubscription } from "../utils/grid-layout-ref";
import { useGrid } from "./internal";

/**
 * The grid's breakpoint, its columns and its width, inside a root or (through its
 * `gridLayoutRef`) from anywhere; `undefined` from outside before a root holds the ref.
 */
export function useBreakpoint(): BreakpointInfo;
export function useBreakpoint(
    gridLayoutRef: GridLayoutRef | undefined,
): BreakpointInfo | undefined;
export function useBreakpoint(
    gridLayoutRef?: GridLayoutRef,
): BreakpointInfo | undefined {
    const grid = useGrid("useBreakpoint", gridLayoutRef);
    const engine = grid?.engine;
    // only these three: a gesture's preview changes elsewhere render nothing here
    const keyNow = () => breakpointKey(engine?.adapter.getView());
    const key = useSyncExternalStore(
        engine ? engine.adapter.subscribe : noSubscription,
        keyNow,
        keyNow,
    );
    return useMemo(
        () => (grid ? breakpointInfoOf(grid.model, key) : undefined),
        [grid, key],
    );
}
