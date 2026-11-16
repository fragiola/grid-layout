import { type DragPreviewState, dragPreviewPart } from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback } from "react";
import type { GridLayoutRef } from "../utils/grid-layout-ref";
import { useGrid, useViewOf } from "./internal";
import type { PartHookResult } from "./use-item";

/**
 * What follows the pointer while it brings a new item; `undefined` when none does. The engine
 * keeps the element at the pointer.
 */
export function useDragPreview(gridLayoutRef?: GridLayoutRef):
    | {
          readonly state: DragPreviewState;
          readonly props: PartHookResult<DragPreviewState>["props"];
      }
    | undefined {
    const grid = useGrid("useDragPreview", gridLayoutRef);
    const view = useViewOf(grid);
    const engine = grid?.engine;
    const ref = useCallback(
        (node: HTMLElement | null) =>
            node && engine
                ? engine.adapter.registerDragPreview(node)
                : undefined,
        [engine],
    );
    const part = dragPreviewPart(view);
    if (!part) return undefined;
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            ref,
        },
    };
}
