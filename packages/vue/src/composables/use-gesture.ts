import type { GestureView } from "@fragiola/grid-layout";
import { type ComputedRef, computed } from "vue";
import { useViewContext } from "../context";

/** The gesture in progress, if any. */
export function useGesture(): ComputedRef<GestureView | undefined> {
    const view = useViewContext("useGesture");
    return computed(() => view.value.gesture);
}
