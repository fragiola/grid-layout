// The engine's public types: its options, the view a render shows, what `get`, `run` and
// `subscribe` take, and what only an adapter calls.

import type { GridGeometry, PixelRect } from "../layout/geometry";
import type { Layout, LayoutItem, ResizeSide } from "../layout/types";

/** How a grid on screen measures, moves and resizes. */
export interface GridLayoutEngineOptions {
    /** a fixed width in pixels (server rendering, tests); without it the root is measured */
    width?: number | undefined;
    /** one row's height in pixels (default 150) */
    rowHeight?: number | undefined;
    /** the space between items, `[inline, block]` in pixels (default `[10, 10]`) */
    gap?: readonly [number, number] | undefined;
    /** the space between the root's edge and the items, `[inline, block]` (default: `gap`) */
    padding?: readonly [number, number] | undefined;
    /** the root's height follows the layout (default true) */
    autoSize?: boolean | undefined;
    /** whether people may drag items at all (default true; an item can say no for itself) */
    draggable?: boolean | undefined;
    /** whether people may resize items at all (default true; an item can say no for itself) */
    resizable?: boolean | undefined;
    /** a dragged item stays inside the root (default false) */
    bounded?: boolean | undefined;
    /** how far a press moves, in pixels, before it is a drag and no longer a click (default 3) */
    threshold?: number | undefined;
    /** the writing direction (default: the root's computed `direction`) */
    dir?: Direction | undefined;
}

/** The writing direction: `x` counts from the inline-start edge, the right one in `rtl`. */
export type Direction = "ltr" | "rtl";

/** What is changing an item: a pointer (mouse, touch or pen) or the keyboard. */
export type GestureSource = "pointer" | "keyboard";

/** A gesture on screen: the item, what it does, and where it would land. */
export interface GestureView {
    /** `move` and `resize` follow a pointer; `keyboard` is a grabbed item the keys move and size */
    readonly kind: "move" | "resize" | "keyboard";
    readonly source: GestureSource;
    readonly itemId: string;
    /** the side a pointer resize pulls */
    readonly side: ResizeSide | undefined;
    /** the item as the gesture found it */
    readonly before: LayoutItem;
    /** the layout if the gesture ended now: every item where it would settle */
    readonly preview: Layout;
    /** where the item would land, in pixels: what a placeholder shows */
    readonly placeholder: PixelRect;
}

/**
 * Everything a render of the grid needs. A new object only when what is rendered changes: the
 * size, the layout, the direction, or where a gesture would land. A pointer moving inside one
 * cell keeps the same view, so nothing renders.
 */
export interface GridLayoutView {
    /** the measured (or given) width; 0 before the root is measured */
    readonly width: number;
    /** the root's height for the layout shown (with `autoSize`) */
    readonly height: number;
    readonly dir: Direction;
    /** the measurements that place items; `undefined` before the width is known */
    readonly geometry: GridGeometry | undefined;
    /** the committed layout */
    readonly layout: Layout;
    /**
     * each item's box, logical (from the inline-start edge): the preview's during a gesture,
     * except the item the gesture holds, which keeps its box from the gesture's start (the engine
     * moves that one itself)
     */
    readonly rects: Readonly<Record<string, PixelRect>>;
    /** the gesture in progress */
    readonly gesture: GestureView | undefined;
    /** the items that have a drag handle: they drag only from it, and it is their tab stop */
    readonly handled: ReadonlySet<string>;
    /** whether people may drag and resize at all (the options) */
    readonly draggable: boolean;
    readonly resizable: boolean;
}

/** What `engine.subscribe` receives: a gesture's steps, for callbacks and announcements. */
export interface GestureEvent {
    /**
     * a pointer: `drag-start`, `drag`, `drag-stop`, `resize-start`, `resize`, `resize-stop`;
     * the keyboard: `grab`, `move`, `resize`, `drop`; either: `cancel` (the layout is restored)
     */
    readonly type:
        | "drag-start"
        | "drag"
        | "drag-stop"
        | "resize-start"
        | "resize"
        | "resize-stop"
        | "grab"
        | "move"
        | "drop"
        | "cancel";
    readonly source: GestureSource;
    readonly itemId: string;
    /** the layout now: the preview during a gesture, the committed one when it ends */
    readonly layout: Layout;
    /** the item as the gesture found it */
    readonly before: LayoutItem;
    /** the item now: in the preview, or as committed */
    readonly item: LayoutItem;
    /** the native event behind it, when there is one */
    readonly nativeEvent: Event | undefined;
}

export type GestureListener = (event: GestureEvent) => void;

/** What `engine.get` reads. */
export interface EngineQueryMap {
    /** the gesture in progress */
    gesture: { payload: undefined; result: GestureView | undefined };
    /** an item's box on screen, logical (as in the view) */
    "item-rect-by": {
        payload: { readonly itemId: string };
        result: PixelRect | undefined;
    };
    /** the cell under a viewport point, kept inside the grid; `undefined` before measuring */
    "cell-at": {
        payload: { readonly clientX: number; readonly clientY: number };
        result: { readonly x: number; readonly y: number } | undefined;
    };
    /** the measurements that place items; `undefined` before the width is known */
    geometry: { payload: undefined; result: GridGeometry | undefined };
    dir: { payload: undefined; result: Direction };
}

/** What `engine.run` does. Engine actions never contain a dot (Dockable rule 13). */
export interface EngineActionMap {
    /** ends the gesture in progress without a command, the layout restored */
    "cancel-gesture": { payload: undefined; result: boolean };
    /** focuses an item (its drag handle when it has one) */
    "focus-item": { payload: { readonly itemId: string }; result: boolean };
}

/** What `engine.is` answers. */
export interface EngineQuestionMap {
    /** whether a gesture holds this item */
    "item-active-by": { readonly itemId: string };
}

/** The arguments after a key: the payload, absent when the key takes none. */
type Args<P> = [P] extends [undefined] ? [] : [payload: P];

/** The calls only an adapter makes: the elements, the events and the options. */
export interface GridLayoutEngineAdapter {
    /** binds the root element: measures it and listens to it; returns the unbinder */
    attach(root: HTMLElement): () => void;
    /** an item's element; returns its unregisterer */
    registerItem(itemId: string, element: HTMLElement): () => void;
    /** an item's drag handle: only handles start its drags, and the first is its tab stop */
    registerDragHandle(itemId: string, element: HTMLElement): () => void;
    /** an item's resize handle for a side */
    registerResizeHandle(
        itemId: string,
        side: ResizeSide,
        element: HTMLElement,
    ): () => void;
    /** the view to render (`useSyncExternalStore`'s snapshot) */
    getView(): GridLayoutView;
    /** calls `listener` when the view changes; returns the remover */
    subscribe(listener: () => void): () => void;
    /** a press on the root, after the app's own handler (`preventDefault` vetoes it) */
    pointerdown(event: PointerEvent): void;
    /** a key on the root, after the app's own handler (`preventDefault` vetoes it) */
    keydown(event: KeyboardEvent): void;
    /** the options, on every render */
    setOptions(options: GridLayoutEngineOptions): void;
}

/** One grid on screen: what the app reads and runs, and the adapter's side. */
export interface GridLayoutEngine {
    get<K extends keyof EngineQueryMap>(
        key: K,
        ...args: Args<EngineQueryMap[K]["payload"]>
    ): EngineQueryMap[K]["result"];
    run<K extends keyof EngineActionMap>(
        action: K,
        ...args: Args<EngineActionMap[K]["payload"]>
    ): EngineActionMap[K]["result"];
    is<K extends keyof EngineQuestionMap>(
        key: K,
        payload: EngineQuestionMap[K],
    ): boolean;
    /** listens to gestures; returns the remover */
    subscribe(listener: GestureListener): () => void;
    /** stops listening to everything and forgets the elements */
    destroy(): void;
    /** adapter-only: an app never calls these */
    readonly adapter: GridLayoutEngineAdapter;
}
