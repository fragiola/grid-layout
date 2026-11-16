// The grid layout reachable from outside its root (X5), in React: the ref itself is the core's
// (`createGridLayoutRef`); here, the hook that makes one and the one that follows it.

import { createGridLayoutRef, type GridLayoutRef } from "@fragiola/grid-layout";
import { useState, useSyncExternalStore } from "react";
import type { GridLayoutContextValue } from "../context";

export type { GridLayoutRef };

const noop = () => {};

/** A subscription to nothing (no grid to follow yet): its unsubscription does nothing. */
export const noSubscription = () => noop;

/** A handle on a grid layout, for `<GridLayout.Root gridLayoutRef>`: the same for the component's life. */
export function useGridLayoutRef(): GridLayoutRef {
    const [gridLayoutRef] = useState(createGridLayoutRef);
    return gridLayoutRef;
}

const noGrid = () => null;

/** The grid a ref holds, following it as `Root`s take and release it (`null` without a ref). */
export function useGridLayoutRefCurrent(
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContextValue | null {
    const read = gridLayoutRef ? () => gridLayoutRef.current : noGrid;
    return useSyncExternalStore(
        gridLayoutRef ? gridLayoutRef.subscribe : noSubscription,
        read,
        read,
    );
}
