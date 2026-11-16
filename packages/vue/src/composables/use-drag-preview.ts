import {
    type DragPreviewState,
    dragPreviewPart,
    type GridLayoutRef,
} from "@fragiola/grid-layout";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import { elementRef, toStyle } from "../utils/render";
import { useGrid, useViewOf } from "./internal";
import type { PartProps } from "./use-item";

/** The drag preview's state and the props to bind onto its element. */
export interface DragPreviewHookResult {
    readonly state: DragPreviewState;
    readonly props: Omit<PartProps, "tabindex">;
}

/**
 * What follows the pointer while it brings a new item; `undefined` when none does. The engine
 * keeps the element at the pointer.
 */
export function useDragPreview(
    gridLayoutRef?: MaybeRefOrGetter<GridLayoutRef | undefined>,
): ComputedRef<DragPreviewHookResult | undefined> {
    const grid = useGrid("useDragPreview", () => toValue(gridLayoutRef));
    const view = useViewOf(grid);
    const ref = elementRef(
        (element) => grid.value?.engine.adapter.registerDragPreview(element),
        () => [grid.value?.engine],
    );
    return computed(() => {
        const part = dragPreviewPart(view.value);
        if (!part) return undefined;
        return {
            state: part.state,
            props: { ...part.attributes, style: toStyle(part.style), ref },
        };
    });
}
