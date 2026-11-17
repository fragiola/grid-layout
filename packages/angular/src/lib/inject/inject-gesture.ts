import { computed, type Signal } from "@angular/core";
import type { GestureView } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";

/** The gesture in progress, if any. */
export function injectGesture(): Signal<GestureView | undefined> {
    const { view } = injectGridLayoutContext("injectGesture");
    return computed(() => view().gesture);
}
