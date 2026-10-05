// The hooks: the lower layer the parts are built on. A part hook returns `{ state, props }`: spread
// `props` (attributes, structural style, the ref that registers the element) onto any element.

import {
    type DragHandleState,
    type DragPreviewState,
    type DragSourceState,
    type DropItem,
    dragHandlePart,
    dragPreviewPart,
    dragSourcePart,
    type ExternalDrop,
    type GestureEvent,
    type GestureListener,
    type GestureView,
    type GridLayoutView,
    type ItemState,
    itemPart,
    type Layout,
    type LayoutItem,
    type PlaceholderState,
    placeholderPart,
    type ResizeHandleState,
    type ResizeSide,
    resizeHandlePart,
} from "@fragiola/grid-layout";
import type * as React from "react";
import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from "react";
import {
    GridLayoutContext,
    type GridLayoutContextValue,
    useGridLayoutContext,
    useItemId,
    useViewContext,
    ViewContext,
} from "./context";
import {
    type GridLayoutRef,
    noSubscription,
    useGridLayoutRefCurrent,
} from "./gridLayoutRef";

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

/**
 * The grid a hook works with: its `gridLayoutRef`'s, from anywhere (`null` until a root holds
 * it), else the root around it.
 */
function useGrid(
    part: string,
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContextValue | null {
    const around = useContext(GridLayoutContext);
    const held = useGridLayoutRefCurrent(gridLayoutRef);
    if (gridLayoutRef) return held;
    if (!around) {
        throw new Error(
            `${part} must be inside a GridLayout.Root, or take a gridLayoutRef`,
        );
    }
    return around;
}

const noView = () => undefined;
const noStatus = () => "";

/** A grid's view, followed from anywhere; `undefined` without a grid. */
function useViewOf(
    grid: GridLayoutContextValue | null,
): GridLayoutView | undefined {
    const read = grid ? grid.engine.adapter.getView : noView;
    return useSyncExternalStore(
        grid ? grid.engine.adapter.subscribe : noSubscription,
        read,
        read,
    );
}

/** The grid layout's model and engine, inside a `GridLayout.Root`. */
export function useGridLayout(): GridLayoutContextValue;
/** The grid layout's model and engine, from anywhere: `null` until a root holds the ref. */
export function useGridLayout(
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContextValue | null;
export function useGridLayout(
    gridLayoutRef?: GridLayoutRef,
): GridLayoutContextValue | null {
    return useGrid("useGridLayout", gridLayoutRef);
}

/** The view the root renders: sizes, rects, the gesture in progress. */
export function useGridLayoutView(): GridLayoutView;
/** The view of the grid a ref holds, from anywhere: `undefined` until a root holds it. */
export function useGridLayoutView(
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutView | undefined;
export function useGridLayoutView(
    gridLayoutRef?: GridLayoutRef,
): GridLayoutView | undefined {
    const grid = useGrid("useGridLayoutView", gridLayoutRef);
    const followed = useViewOf(gridLayoutRef ? grid : null);
    const around = useContext(ViewContext);
    return gridLayoutRef ? followed : (around ?? undefined);
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
 * Listens to the gestures (pointer, keyboard and drops), for callbacks and announcements; the
 * listener may change on every render. Outside the root, through its `gridLayoutRef`.
 */
export function useGridLayoutEvents(
    listener: GestureListener,
    gridLayoutRef?: GridLayoutRef,
): void {
    const grid = useGrid("useGridLayoutEvents", gridLayoutRef);
    const latest = useRef(listener);
    latest.current = listener;
    const engine = grid?.engine;
    useEffect(
        () => engine?.subscribe((event) => latest.current(event)),
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

/** What a drop gives its callbacks: the item as added, the source's data, the layout. */
export interface DropDetails {
    readonly item: LayoutItem;
    readonly data: unknown;
    readonly layout: Layout;
}

/** A drop's details, from its event. */
export function dropDetailsOf(event: GestureEvent): DropDetails {
    return { item: event.item, data: event.data, layout: event.layout };
}

/** What makes an element a drag source. */
export interface DragSourceOptions {
    /** the new item's size and limits */
    readonly item: DropItem;
    /** the new item's id (default: `createId`'s, else a random UUID) */
    readonly itemId?: string | undefined;
    /** the app's own data, told back in the gesture's events and `onDrop` */
    readonly data?: unknown;
    /** where the item sits from the pointer, in pixels on screen (default: centred under it) */
    readonly dragOffset?: ExternalDrop["dragOffset"];
    /** starts nothing, and is no tab stop */
    readonly disabled?: boolean | undefined;
    /** the grid, for a source outside its root (inside one, the root around it) */
    readonly gridLayoutRef?: GridLayoutRef | undefined;
    /** an item from this source was added */
    readonly onDrop?: ((drop: DropDetails) => void) | undefined;
}

/** A drag source's props: the part's, and the handlers that start a drop (after the app's own). */
export interface DragSourceHookResult {
    readonly state: DragSourceState;
    readonly props: PartHookResult<DragSourceState>["props"] & {
        readonly onPointerDown: (event: React.PointerEvent) => void;
        readonly onKeyDown: (event: React.KeyboardEvent) => void;
    };
}

/**
 * A drag source (X1, X6): pressed and dragged, or Space/Enter, it brings a new item into the grid.
 * Spread its handlers after the element's own: `preventDefault` there vetoes the drop.
 */
export function useDragSource(
    options: DragSourceOptions,
): DragSourceHookResult {
    const grid = useGrid("useDragSource", options.gridLayoutRef);
    const latest = useRef(options);
    latest.current = options;
    const element = useRef<HTMLElement | null>(null);
    const engine = grid?.engine;
    const disabled = options.disabled === true;
    // only this source's part of the view: a gesture elsewhere renders nothing here (and the
    // check allocates nothing, on every view change of every source)
    const statusNow = () => {
        const gesture = engine?.adapter.getView().gesture;
        return gesture?.kind === "drop" &&
            element.current !== null &&
            gesture.origin === element.current
            ? gesture.source
            : "";
    };
    useSyncExternalStore(
        engine ? engine.adapter.subscribe : noSubscription,
        statusNow,
        noStatus,
    );
    const ref = useCallback(
        (node: HTMLElement | null) => {
            element.current = node;
            if (!node) return undefined;
            // leaving the page ends what it started (React 19's ref cleanup)
            return () => {
                engine?.adapter.releaseSource(node);
                if (element.current === node) element.current = null;
            };
        },
        [engine],
    );
    // `onDrop`: the drops this source started
    useEffect(
        () =>
            engine?.subscribe((event) => {
                if (
                    event.type === "drop" &&
                    event.external &&
                    event.origin !== undefined &&
                    event.origin === element.current
                ) {
                    latest.current.onDrop?.(dropDetailsOf(event));
                }
            }),
        [engine],
    );
    const dropOf = (): ExternalDrop => {
        const { item, itemId, data, dragOffset } = latest.current;
        return { item, itemId, data, dragOffset };
    };
    const part = dragSourcePart(
        engine?.adapter.getView(),
        element.current,
        disabled,
    );
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            tabIndex: part.tabIndex,
            ref,
            onPointerDown: (event) => {
                if (!engine || disabled || !element.current) return;
                engine.adapter.startExternalDrag(
                    event.nativeEvent,
                    element.current,
                    dropOf(),
                );
            },
            onKeyDown: (event) => {
                if (!engine || disabled || !element.current) return;
                engine.adapter.startExternalGrab(
                    event.nativeEvent,
                    element.current,
                    dropOf(),
                );
            },
        },
    };
}

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

/** The active breakpoint, its columns and the grid's width (0 before it is measured). */
export interface BreakpointInfo {
    readonly breakpoint: string;
    readonly cols: number;
    readonly width: number;
}

/**
 * The grid's breakpoint, its columns and its width, inside a root or (through its
 * `gridLayoutRef`) from anywhere; `undefined` from outside before a root holds the ref.
 */
export function useBreakpoint(): BreakpointInfo;
export function useBreakpoint(
    gridLayoutRef: GridLayoutRef | undefined,
): BreakpointInfo | undefined;
export function useBreakpoint(
    gridLayoutRef?: GridLayoutRef,
): BreakpointInfo | undefined {
    const grid = useGrid("useBreakpoint", gridLayoutRef);
    const engine = grid?.engine;
    // only these three: a gesture's preview changes elsewhere render nothing here
    const keyNow = () => {
        const view = engine?.adapter.getView();
        return view
            ? `${view.breakpoint}\u0000${view.geometry?.cols ?? ""}\u0000${view.width}`
            : "";
    };
    const key = useSyncExternalStore(
        engine ? engine.adapter.subscribe : noSubscription,
        keyNow,
        keyNow,
    );
    return useMemo(() => {
        if (!grid || key === "") return undefined;
        const [name = "", cols, width] = key.split("\u0000");
        return {
            breakpoint: name,
            cols:
                Number(cols) ||
                grid.model.get("cols-by", { breakpoint: name }) ||
                grid.model.get("cols"),
            width: Number(width),
        };
    }, [grid, key]);
}
