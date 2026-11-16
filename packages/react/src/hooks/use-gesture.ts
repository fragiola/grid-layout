import type { GestureView } from "@fragiola/grid-layout";
import { useViewContext } from "../context";

/** The gesture in progress, if any. */
export function useGesture(): GestureView | undefined {
    return useViewContext("useGesture").gesture;
}
