import { useMemo, useSyncExternalStore } from "react";
import { type GridLayoutRef, noSubscription } from "../utils/grid-layout-ref";
import { useGrid } from "./internal";

/** The active breakpoint, its columns and the grid's width (0 before it is measured). */
export interface BreakpointInfo {
    readonly breakpoint: string;
    readonly cols: number;
    readonly width: number;
}

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
    const keyNow = () => {
        const view = engine?.adapter.getView();
        return view
            ? `${view.breakpoint}\u0000${view.geometry?.cols ?? ""}\u0000${view.width}`
            : "";
    };
    const key = useSyncExternalStore(
        engine ? engine.adapter.subscribe : noSubscription,
        keyNow,
        keyNow,
    );
    return useMemo(() => {
        if (!grid || key === "") return undefined;
        const [name = "", cols, width] = key.split("\u0000");
        return {
            breakpoint: name,
            cols:
                Number(cols) ||
                grid.model.get("cols-by", { breakpoint: name }) ||
                grid.model.get("cols"),
            width: Number(width),
        };
    }, [grid, key]);
}
