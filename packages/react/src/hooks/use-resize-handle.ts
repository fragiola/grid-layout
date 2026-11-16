import {
    type ResizeHandleState,
    type ResizeSide,
    resizeHandlePart,
} from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback } from "react";
import { useGridLayoutContext, useItemId, useViewContext } from "../context";
import type { PartHookResult } from "./use-item";

/** A resize handle for a side or corner; `state.resizable` false: render none. */
export function useResizeHandle(
    side: ResizeSide,
    itemId?: string,
): PartHookResult<ResizeHandleState> {
    const { engine } = useGridLayoutContext("useResizeHandle");
    const view = useViewContext("useResizeHandle");
    const id = useItemId("useResizeHandle", itemId);
    const ref = useCallback(
        // registered while attached, unregistered by the returned cleanup (React 19)
        (element: HTMLElement | null) =>
            element
                ? engine.adapter.registerResizeHandle(id, side, element)
                : undefined,
        [engine, id, side],
    );
    const part = resizeHandlePart(view, id, side);
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            ref,
        },
    };
}
