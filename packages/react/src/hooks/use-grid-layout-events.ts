import type { GestureListener } from "@fragiola/grid-layout";
import { useEffect, useRef } from "react";
import type { GridLayoutRef } from "../utils/grid-layout-ref";
import { useGrid } from "./internal";

/**
 * Listens to the gestures (pointer, keyboard and drops), for callbacks and announcements; the
 * listener may change on every render. Outside the root, through its `gridLayoutRef`.
 */
export function useGridLayoutEvents(
    listener: GestureListener,
    gridLayoutRef?: GridLayoutRef,
): void {
    const grid = useGrid("useGridLayoutEvents", gridLayoutRef);
    const latest = useRef(listener);
    latest.current = listener;
    const engine = grid?.engine;
    useEffect(
        () => engine?.subscribe((event) => latest.current(event)),
        [engine],
    );
}
