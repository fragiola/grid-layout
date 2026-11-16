import { type DragHandleState, dragHandlePart } from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback } from "react";
import { useGridLayoutContext, useItemId, useViewContext } from "../context";
import type { PartHookResult } from "./use-item";

/** A drag handle: the only place its item drags from, and its tab stop. */
export function useDragHandle(
    itemId?: string,
): PartHookResult<DragHandleState> {
    const { engine } = useGridLayoutContext("useDragHandle");
    const view = useViewContext("useDragHandle");
    const id = useItemId("useDragHandle", itemId);
    const ref = useCallback(
        // registered while attached, unregistered by the returned cleanup (React 19)
        (element: HTMLElement | null) =>
            element
                ? engine.adapter.registerDragHandle(id, element)
                : undefined,
        [engine, id],
    );
    const part = dragHandlePart(view, id);
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            tabIndex: part.tabIndex,
            ref,
        },
    };
}
