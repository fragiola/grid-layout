// What the composables share: the grid a composable works with (the root around it, or the one
// its `gridLayoutRef` holds) and that grid's view, followed with Vue's reactivity.

import type {
    GridLayoutHandle,
    GridLayoutRef,
    GridLayoutView,
} from "@fragiola/grid-layout";
import { type ComputedRef, computed, inject, toRaw } from "vue";
import { GridLayoutKey } from "../context";
import { useExternal } from "../utils/render";

/**
 * The grid a composable works with: its `gridLayoutRef`'s, from anywhere (`null` until a root
 * holds it), else the root around it.
 */
export function useGrid(
    part: string,
    givenRef: () => GridLayoutRef | undefined,
): ComputedRef<GridLayoutHandle | null> {
    // the ref itself, not a reactive proxy of it: its `current` is the core's plain handle
    const gridLayoutRef = () => {
        const given = givenRef();
        return given && toRaw(given);
    };
    const around = inject(GridLayoutKey, null);
    if (!gridLayoutRef() && !around) {
        throw new Error(
            `${part} must be inside a GridLayout.Root, or take a gridLayoutRef`,
        );
    }
    const held = useExternal(
        () => gridLayoutRef()?.subscribe,
        () => gridLayoutRef()?.current ?? null,
    );
    return computed(() => (gridLayoutRef() ? held.value : around));
}

/** A grid's view, followed from anywhere; `undefined` without a grid. */
export function useViewOf(
    grid: ComputedRef<GridLayoutHandle | null>,
): ComputedRef<GridLayoutView | undefined> {
    return useExternal(
        () => grid.value?.engine.adapter.subscribe,
        () => grid.value?.engine.adapter.getView(),
    );
}
