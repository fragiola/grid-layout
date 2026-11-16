// The state of the part around the code that calls them: an item's content, a handle's, a
// source's. The directive puts the attributes, the style and the listeners on its element; these
// hand its state to a component inside it.

import { inject, type Signal } from "@angular/core";
import type {
    DragHandleState,
    DragSourceState,
    ItemState,
    ResizeHandleState,
} from "@fragiola/grid-layout";
import { GridLayoutDragHandle } from "../directives/drag-handle.directive";
import { GridLayoutDragSource } from "../directives/drag-source.directive";
import { GridLayoutItem } from "../directives/item.directive";
import { GridLayoutResizeHandle } from "../directives/resize-handle.directive";

/** What a part's injection function returns: the part's state, as a signal. */
export interface InjectPartResult<S> {
    readonly state: Signal<S>;
}

function enclosing<D>(directive: D | null, part: string, fn: string): D {
    if (!directive) {
        throw new Error(`${fn} must be used inside [${part}]`);
    }
    return directive;
}

/** The state of the enclosing `[gridLayoutItem]` (`dragging`, `grabbed`, `item`, …). */
export function injectItem(): InjectPartResult<ItemState> {
    const item = enclosing(
        inject(GridLayoutItem, { optional: true }),
        "gridLayoutItem",
        "injectItem",
    );
    return { state: item.state };
}

/** The state of the enclosing `[gridLayoutDragHandle]` (`dragging`, `grabbed`, `draggable`). */
export function injectDragHandle(): InjectPartResult<DragHandleState> {
    const handle = enclosing(
        inject(GridLayoutDragHandle, { optional: true }),
        "gridLayoutDragHandle",
        "injectDragHandle",
    );
    return { state: handle.state };
}

/** The state of the enclosing `*gridLayoutResizeHandle` (`side`, `resizing`). */
export function injectResizeHandle(): InjectPartResult<ResizeHandleState> {
    const handle = enclosing(
        inject(GridLayoutResizeHandle, { optional: true }),
        "gridLayoutResizeHandle",
        "injectResizeHandle",
    );
    return { state: handle.state };
}

/** The state of the enclosing `[gridLayoutDragSource]` (`dragging`, `grabbed`, `disabled`). */
export function injectDragSource(): InjectPartResult<DragSourceState> {
    const source = enclosing(
        inject(GridLayoutDragSource, { optional: true }),
        "gridLayoutDragSource",
        "injectDragSource",
    );
    return { state: source.state };
}
