// From Data Grid (fragiola/data-grid, packages/react/src/gridRef.ts), same author and licence.
// The grid layout reachable from outside its root (X5): a drag source in a sidebar, a toolbar that
// runs commands, an announcer next to the grid.

import { useState, useSyncExternalStore } from "react";
import type { GridLayoutContextValue } from "./context";

/**
 * A handle on a grid layout from outside its `GridLayout.Root`: `current` is the grid's model and
 * engine while a `Root` holds it (`<GridLayout.Root gridLayoutRef={gridLayoutRef}>`), `null`
 * otherwise. Unlike a plain ref it tells when that changes, so hooks and parts take it
 * (`useGridLayout(gridLayoutRef)`, `<GridLayout.DragSource gridLayoutRef>`) and follow the grid
 * from anywhere.
 */
export interface GridLayoutRef {
    readonly current: GridLayoutContextValue | null;
    /** listens to a `Root` taking or releasing it; returns the unsubscription */
    subscribe(listener: () => void): () => void;
}

const noop = () => {};

/** A subscription to nothing (no grid to follow yet): its unsubscription does nothing. */
export const noSubscription = () => noop;

/** What sets a ref's `current`: kept off the ref, so only a `Root` writes it. */
const writers = new WeakMap<
    object,
    (value: GridLayoutContextValue | null) => void
>();

/**
 * A handle on a grid layout, made outside a component (a module, a test, a store): the same as
 * `useGridLayoutRef()` returns. A `gridLayoutRef` must be made by one of the two.
 */
export function createGridLayoutRef(): GridLayoutRef {
    let current: GridLayoutContextValue | null = null;
    const listeners = new Set<() => void>();
    const gridLayoutRef: GridLayoutRef = {
        get current() {
            return current;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
    writers.set(gridLayoutRef, (value) => {
        current = value;
        for (const listener of [...listeners]) listener();
    });
    return gridLayoutRef;
}

/** A handle on a grid layout, for `<GridLayout.Root gridLayoutRef>`: the same for the component's life. */
export function useGridLayoutRef(): GridLayoutRef {
    const [gridLayoutRef] = useState(createGridLayoutRef);
    return gridLayoutRef;
}

/**
 * Hands a `Root`'s grid to its `gridLayoutRef`; returns the release. A ref belongs to one mounted
 * `Root` at a time: a second one is told about in the console and does not take it, rather than
 * breaking the page for a mistake the types cannot see.
 */
export function attachGridLayoutRef(
    gridLayoutRef: GridLayoutRef,
    grid: GridLayoutContextValue,
): () => void {
    const write = writers.get(gridLayoutRef);
    if (!write) {
        console.error(
            "<GridLayout.Root gridLayoutRef>: the ref must come from useGridLayoutRef() or createGridLayoutRef()",
        );
        return noop;
    }
    if (gridLayoutRef.current && gridLayoutRef.current !== grid) {
        console.error(
            "<GridLayout.Root gridLayoutRef>: this ref is already held by another mounted root; give each root its own",
        );
        return noop;
    }
    write(grid);
    return () => {
        if (gridLayoutRef.current === grid) write(null);
    };
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
