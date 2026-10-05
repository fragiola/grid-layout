// The hooks: the lower layer the parts are built on. A part hook returns `{ state, props }`: spread
// `props` (attributes, structural style, the ref that registers the element) onto any element.

import {
    type DragHandleState,
    dragHandlePart,
    type GestureListener,
    type GestureView,
    type GridLayoutView,
    type ItemState,
    itemPart,
    type Layout,
    type PlaceholderState,
    placeholderPart,
    type ResizeHandleState,
    type ResizeSide,
    resizeHandlePart,
} from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import {
    type GridLayoutContextValue,
    useGridLayoutContext,
    useItemId,
    useViewContext,
} from "./context";

/** A part hook's result: the state, and the props to spread onto the element. */
export interface PartHookResult<S> {
    readonly state: S;
    readonly props: {
        readonly style: React.CSSProperties;
        readonly ref: React.RefCallback<HTMLElement>;
        readonly tabIndex?: number;
        readonly [attribute: `data-${string}`]: string;
    };
}

/** The grid layout's model and engine, inside a `GridLayout.Root`. */
export function useGridLayout(): GridLayoutContextValue {
    return useGridLayoutContext("useGridLayout");
}

/** The view the root renders: sizes, rects, the gesture in progress. */
export function useGridLayoutView(): GridLayoutView {
    return useViewContext("useGridLayoutView");
}

/** The committed layout's items, in order. */
export function useItems(): Layout {
    return useViewContext("useItems").layout;
}

/** The gesture in progress, if any. */
export function useGesture(): GestureView | undefined {
    return useViewContext("useGesture").gesture;
}

/**
 * Listens to the gestures (pointer and keyboard), for callbacks and announcements; the listener
 * may change on every render.
 */
export function useGridLayoutEvents(listener: GestureListener): void {
    const { engine } = useGridLayoutContext("useGridLayoutEvents");
    const latest = useRef(listener);
    latest.current = listener;
    useEffect(
        () => engine.subscribe((event) => latest.current(event)),
        [engine],
    );
}

/** An item: placed at its box, registered with the engine. */
export function useItem(itemId: string): PartHookResult<ItemState> {
    const { engine } = useGridLayoutContext("useItem");
    const view = useViewContext("useItem");
    const ref = useCallback(
        // registered while attached, unregistered by the returned cleanup (React 19)
        (element: HTMLElement | null) =>
            element ? engine.adapter.registerItem(itemId, element) : undefined,
        [engine, itemId],
    );
    const part = itemPart(view, itemId);
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

/** Where the held item would land; `undefined` when no gesture is in progress. */
export function usePlaceholder():
    | {
          readonly state: PlaceholderState;
          readonly props: {
              readonly style: React.CSSProperties;
              readonly [attribute: `data-${string}`]: string;
          };
      }
    | undefined {
    const view = useViewContext("usePlaceholder");
    const part = placeholderPart(view);
    if (!part) return undefined;
    return {
        state: part.state,
        props: { ...part.attributes, style: part.style as React.CSSProperties },
    };
}
