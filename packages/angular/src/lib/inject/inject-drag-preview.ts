import { computed, type Signal } from "@angular/core";
import {
    type DragPreviewState,
    dragPreviewPart,
    type GridLayoutRef,
    type Part,
} from "@fragiola/grid-layout";
import { injectRootOrRef } from "../context";
import { gridOf, viewOf } from "../utils/signals";

/**
 * What follows the pointer while it brings a new item (its state, its `data-*`, its structural
 * style); `undefined` when none does. What `*gridLayoutDragPreview` renders: the engine keeps
 * that element at the pointer.
 */
export function injectDragPreview(
    gridLayoutRef?: GridLayoutRef,
): Signal<Part<DragPreviewState> | undefined> {
    const view = viewOf(
        gridOf(
            () => gridLayoutRef,
            injectRootOrRef("injectDragPreview", gridLayoutRef),
        ),
    );
    return computed(() => dragPreviewPart(view()));
}
