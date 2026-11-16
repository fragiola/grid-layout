import type { DragSourceState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import {
    type DragSourceOptions,
    useDragSource,
} from "../hooks/use-drag-source";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

/** A primitive's props, without the DOM's own `onDrop` (a drop's callback here). */
type WithoutDomDrop<P> = Omit<P, "onDrop">;

/** `GridLayout.DragSource`'s props: what it brings, and an element's own. */
export type DragSourceProps = WithoutDomDrop<
    DivPrimitiveProps<DragSourceState>
> &
    DragSourceOptions & {
        children?: ReactNode;
    };

/**
 * An element anywhere on the page that brings a new item into the grid: pressed and dragged, or
 * Space/Enter from the keyboard (X1, X6). Outside the root it takes the grid's `gridLayoutRef`.
 * It is a tab stop, and renders only its children.
 */
export function DragSource(props: DragSourceProps) {
    const {
        item,
        itemId,
        data,
        dragOffset,
        disabled,
        gridLayoutRef,
        onDrop,
        children,
        ...rest
    } = props;
    const { state, props: own } = useDragSource({
        item,
        itemId,
        data,
        dragOffset,
        disabled,
        gridLayoutRef,
        onDrop,
    });
    const { ref, onPointerDown, onKeyDown, ...internal } = own;
    return useRenderElement("div", rest, {
        state,
        props: internal,
        ref,
        children,
        // the engine's after the app's own handlers: `preventDefault` vetoes the drop
        after: { onPointerDown, onKeyDown },
    });
}
