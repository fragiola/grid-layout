// From Dockable (fragiola/dockable, packages/angular/src/lib/utils/helpers.ts `fromStore`), same author and licence.
// The grid a part or an injection function works with (the root around it, or the one its
// `gridLayoutRef` holds) and that grid's view, followed as signals.

import {
    computed,
    effect,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import {
    type CellRows,
    type CellState,
    cellPart,
    cellRowCount,
    type GridLayoutHandle,
    type GridLayoutRef,
    type GridLayoutView,
    type Part,
} from "@fragiola/grid-layout";
import type { GridLayoutContext } from "../context";

/** A subscription: calls its listener on each change, returns the remover. */
export type Subscribe = (listener: () => void) => () => void;

/**
 * A value read from an external store as a signal: it re-reads `read()` whenever the store
 * notifies (and whenever a signal it reads changes), and tells its readers only when the value
 * changes. The store itself may change: `subscribe` is read in a reactive context (`undefined`:
 * nothing to follow yet). The subscription ends with the directive.
 */
export function fromStore<S>(
    subscribe: () => Subscribe | undefined,
    read: () => S,
): Signal<S> {
    const tick = signal(0);
    effect((onCleanup) => {
        const subscribeTo = subscribe();
        if (!subscribeTo) return;
        onCleanup(
            subscribeTo(() => {
                tick.update((value) => value + 1);
            }),
        );
        // a change between the first read and the subscription is read again
        untracked(() => tick.update((value) => value + 1));
    });
    return computed(() => {
        tick();
        return read();
    });
}

/**
 * The grid a part or an injection function works with: its `gridLayoutRef`'s, from anywhere
 * (`null` until a root holds it), else the root around it. Neither is an error, named for `part`,
 * once read.
 */
export function gridOf(
    part: string,
    gridLayoutRef: () => GridLayoutRef | undefined,
    around: GridLayoutContext | null,
): Signal<GridLayoutHandle | null> {
    const held = fromStore(
        () => gridLayoutRef()?.subscribe,
        () => gridLayoutRef()?.current ?? null,
    );
    return computed(() => {
        if (gridLayoutRef()) return held();
        if (!around) {
            throw new Error(
                `${part} must be used inside [gridLayoutRoot], or take a gridLayoutRef`,
            );
        }
        return around.handle();
    });
}

/** A grid's view, followed from anywhere; `undefined` without a grid. */
export function viewOf(
    grid: Signal<GridLayoutHandle | null>,
): Signal<GridLayoutView | undefined> {
    return fromStore(
        () => grid()?.engine.adapter.subscribe,
        () => grid()?.engine.adapter.getView(),
    );
}

/**
 * A root's cells as a signal, made again only when they move: a gesture that keeps the rows
 * computes none (D8).
 */
export function cellsOf(
    context: GridLayoutContext,
    rows: () => CellRows | undefined,
): Signal<readonly Part<CellState>[]> {
    let lastKey: string | undefined;
    let last: readonly Part<CellState>[] = [];
    return computed((): readonly Part<CellState>[] => {
        const view = context.view();
        if (!view.geometry) {
            lastKey = undefined;
            last = [];
            return last;
        }
        const count = cellRowCount(view, rows() ?? "auto");
        const geometry = view.geometry;
        const key = [
            count,
            view.dir,
            view.width,
            geometry.cols,
            geometry.rowHeight,
            geometry.gap[0],
            geometry.gap[1],
            geometry.padding[0],
            geometry.padding[1],
        ].join(",");
        if (key === lastKey) return last;
        lastKey = key;
        last = context
            .handle()
            .engine.get("cells", { rows: count })
            .map((cell) => cellPart(view, cell));
        return last;
    });
}
