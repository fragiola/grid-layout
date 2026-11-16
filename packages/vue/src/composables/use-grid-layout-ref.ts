import { createGridLayoutRef, type GridLayoutRef } from "@fragiola/grid-layout";
import { markRaw } from "vue";

/**
 * A handle on a grid layout, for `<GridLayout.Root :grid-layout-ref>`: call it in `setup`, it is
 * the same for the component's life (`createGridLayoutRef()` makes one outside a component).
 */
export function useGridLayoutRef(): GridLayoutRef {
    // kept out of Vue's reactivity: in `ref()` or `reactive()` state it stays the core's object
    return markRaw(createGridLayoutRef());
}
