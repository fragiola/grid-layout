import type { GestureListener, GridLayoutRef } from "@fragiola/grid-layout";
import { watchEffect } from "vue";
import { useGrid } from "./internal";

/**
 * Listens to the gestures (pointer, keyboard and drops), for callbacks and announcements, until
 * the component goes. Outside the root, through its `gridLayoutRef`.
 */
export function useGridLayoutEvents(
    listener: GestureListener,
    gridLayoutRef?: GridLayoutRef,
): void {
    const grid = useGrid("useGridLayoutEvents", () => gridLayoutRef);
    watchEffect((onCleanup) => {
        const engine = grid.value?.engine;
        if (engine) onCleanup(engine.subscribe((event) => listener(event)));
    });
}
