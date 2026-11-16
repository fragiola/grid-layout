import type { GridLayoutView } from "@fragiola/grid-layout";
import { useContext, useSyncExternalStore } from "react";
import { GridLayoutContext, type GridLayoutContextValue } from "../context";
import {
    type GridLayoutRef,
    noSubscription,
    useGridLayoutRefCurrent,
} from "../utils/grid-layout-ref";

/**
 * The grid a hook works with: its `gridLayoutRef`'s, from anywhere (`null` until a root holds
 * it), else the root around it.
 */
export function useGrid(
    part: string,
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContextValue | null {
    const around = useContext(GridLayoutContext);
    const held = useGridLayoutRefCurrent(gridLayoutRef);
    if (gridLayoutRef) return held;
    if (!around) {
        throw new Error(
            `${part} must be inside a GridLayout.Root, or take a gridLayoutRef`,
        );
    }
    return around;
}

const noView = () => undefined;

/** A grid's view, followed from anywhere; `undefined` without a grid. */
export function useViewOf(
    grid: GridLayoutContextValue | null,
): GridLayoutView | undefined {
    const read = grid ? grid.engine.adapter.getView : noView;
    return useSyncExternalStore(
        grid ? grid.engine.adapter.subscribe : noSubscription,
        read,
        read,
    );
}
