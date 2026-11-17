import { effect, untracked } from "@angular/core";
import type { GestureListener, GridLayoutRef } from "@fragiola/grid-layout";
import { injectRootOrRef } from "../context";
import { gridOf } from "../utils/signals";

/**
 * Listens to the gestures (pointer, keyboard and drops), for callbacks and announcements, until
 * the component goes. Outside the root, through its `gridLayoutRef`. Call it in an injection
 * context.
 */
export function injectGridLayoutEvents(
    listener: GestureListener,
    gridLayoutRef?: GridLayoutRef,
): void {
    const grid = gridOf(
        "injectGridLayoutEvents",
        () => gridLayoutRef,
        injectRootOrRef("injectGridLayoutEvents", gridLayoutRef),
    );
    effect((onCleanup) => {
        const engine = grid()?.engine;
        if (engine) {
            untracked(() =>
                onCleanup(engine.subscribe((event) => listener(event))),
            );
        }
    });
}
