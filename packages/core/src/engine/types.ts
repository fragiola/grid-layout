// The engine's public types: its options, the view a render shows, what `get`, `run` and
// `subscribe` take, and what only an adapter calls.

import type { GridGeometry, PixelRect } from "../layout/geometry";
import type { Layout, LayoutItem, ResizeSide } from "../layout/types";

/** What a drag source brings into the grid: the new item's size and limits, never its cell. */
export type DropItem = Pick<LayoutItem, "w" | "h"> &
    Partial<Pick<LayoutItem, "minW" | "maxW" | "minH" | "maxH">>;

/** A drop from outside the grid: the item it adds, its id, and the app's own data. */
export interface ExternalDrop {
    readonly item: DropItem;
    /** the new item's id (default: the `createId` option's, else a random UUID, made when the drop begins) */
    readonly itemId?: string | undefined;
    /** the app's own data: opaque, told back in the gesture's events and the drop */
    readonly data?: unknown;
    /** where the item sits from the pointer, in pixels on screen (default: centred under it) */
    readonly dragOffset?:
        | { readonly x: number; readonly y: number }
        | undefined;
}

/**
 * What `onExternalDrag` answers for a native drag (files, links, text from another window): the
 * item to drop and its data, `false` to refuse it, `undefined` to let it pass.
 */
export type ExternalDragAnswer =
    | (DropItem & { readonly data?: unknown })
    | false
    | undefined;

/** How a grid on screen measures, moves and resizes. */
export interface GridLayoutEngineOptions {
    /** a fixed width in pixels (server rendering, tests); without it the root is measured */
    width?: number | undefined;
    /** one row's height in pixels, for every breakpoint or each one (default 150) */
    rowHeight?: PerBreakpoint<number> | undefined;
    /**
     * the space between items, `[inline, block]` in pixels, for every breakpoint or each one
     * (default `[10, 10]`)
     */
    gap?: PerBreakpoint<readonly [number, number]> | undefined;
    /** the space between the root's edge and the items, `[inline, block]` (default: `gap`) */
    padding?: PerBreakpoint<readonly [number, number]> | undefined;
    /**
     * the breakpoint, controlled: it overrides the one the grid's width gives (default: the
     * width's, R1)
     */
    breakpoint?: string | undefined;
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
    /**
     * a native drag entering the root (files, links, text from another window): the item to drop,
     * `false` to refuse, `undefined` to ignore. Asked again on the drop, when the files can be
     * read: that answer can refuse, and gives the drop's data; the size stays the one shown
     */
    onExternalDrag?: ((event: DragEvent) => ExternalDragAnswer) | undefined;
    /**
     * a new id for an item dropped from outside without one, made when its drop begins (default:
     * a random UUID from the root's window)
     */
    createId?: (() => string) | undefined;
}

/** A value for every breakpoint, or one per breakpoint (a breakpoint left out takes the default). */
export type PerBreakpoint<T> = T | Readonly<Record<string, T>>;

/** The writing direction: `x` counts from the inline-start edge, the right one in `rtl`. */
export type Direction = "ltr" | "rtl";

/**
 * What is changing an item: a pointer (mouse, touch or pen), the keyboard, or a native drag from
 * another window.
 */
export type GestureSource = "pointer" | "keyboard" | "native";

/** A gesture on screen: the item, what it does, and where it would land. */
export interface GestureView {
    /**
     * `move` and `resize` follow a pointer; `keyboard` is a grabbed item the keys move and size;
     * `drop` is a new item coming from outside the grid
     */
    readonly kind: "move" | "resize" | "keyboard" | "drop";
    readonly source: GestureSource;
    /** the held item; a drop's is the id it lands with (the source's `itemId`, or a new one) */
    readonly itemId: string;
    /** the side a pointer resize pulls */
    readonly side: ResizeSide | undefined;
    /** the item as the gesture found it */
    readonly before: LayoutItem;
    /** the layout if the gesture ended now: every item where it would settle */
    readonly preview: Layout;
    /** where the item would land, in pixels: what a placeholder shows */
    readonly placeholder: PixelRect;
    /** the pointer is off the grid: a move goes back to its cell, a drop adds nothing */
    readonly outside: boolean;
    /** the model refuses the drop where it is (a middleware, a collision) */
    readonly refused: boolean;
    /** a drop's data, as its source gave it */
    readonly data: unknown;
    /** the drag source a drop started from (`undefined` for a native drag and the grid's own) */
    readonly origin: HTMLElement | undefined;
}

/**
 * Everything a render of the grid needs. A new object only when what is rendered changes: the
 * size, the layout, the direction, or where a gesture would land. A pointer moving inside one
 * cell keeps the same view, so nothing renders.
 */
export interface GridLayoutView {
    /** the measured (or given) width; 0 before the root is measured */
    readonly width: number;
    /** the active breakpoint (the grid's width decides it, R1) */
    readonly breakpoint: string;
    /** the root's height for the layout shown (with `autoSize`) */
    readonly height: number;
    readonly dir: Direction;
    /** the measurements that place items; `undefined` before the width is known */
    readonly geometry: GridGeometry | undefined;
    /** the committed layout */
    readonly layout: Layout;
    /** the committed layout's items, by id */
    readonly items: ReadonlyMap<string, LayoutItem>;
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
    /** an external drag over the grid that would not drop: `onExternalDrag` or the model said no */
    readonly dropRefused: boolean;
}

/** What `engine.subscribe` receives: a gesture's steps, for callbacks and announcements. */
export interface GestureEvent {
    /**
     * a pointer: `drag-start`, `drag`, `drag-stop`, `resize-start`, `resize`, `resize-stop`;
     * the keyboard: `grab`, `move`, `resize`, `drop`; either: `cancel` (the layout is restored).
     * A drop from outside by pointer or native drag: `drop-start`, `drop-over`, `drop`,
     * `drop-cancel`; by keyboard, the keyboard's, with `external`
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
        | "cancel"
        | "drop-start"
        | "drop-over"
        | "drop-cancel";
    readonly source: GestureSource;
    /** the held item; a drop's is the id it lands with */
    readonly itemId: string;
    /** the layout now: the preview during a gesture, the committed one when it ends */
    readonly layout: Layout;
    /** the item as the gesture found it */
    readonly before: LayoutItem;
    /** the item now: in the preview, or as committed */
    readonly item: LayoutItem;
    /** the native event behind it, when there is one */
    readonly nativeEvent: Event | undefined;
    /** a drop from outside the grid */
    readonly external: boolean;
    /** a drop's data, as its source (or `onExternalDrag`) gave it */
    readonly data: unknown;
    /** the pointer is off the grid: a move released there runs no command */
    readonly outside: boolean;
    /** a move released off the grid: the element under the pointer (a trash); `null` otherwise */
    readonly target: Element | null;
    /** the drag source a drop started from (`undefined` for a native drag and the grid's own) */
    readonly origin: HTMLElement | undefined;
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
    /** a press on a drag source, after the app's own handler: past the threshold, a drop begins */
    startExternalDrag(
        event: PointerEvent,
        source: HTMLElement,
        drop: ExternalDrop,
    ): void;
    /** a key on a drag source, after the app's own handler: Space or Enter grabs a new item */
    startExternalGrab(
        event: KeyboardEvent,
        source: HTMLElement,
        drop: ExternalDrop,
    ): void;
    /** a drag source leaving the page: a drop it started ends, unapplied */
    releaseSource(source: HTMLElement): void;
    /** the drag preview's element: the engine keeps it at the pointer; returns its unregisterer */
    registerDragPreview(element: HTMLElement): () => void;
    /** a native drag over the root */
    dragenter(event: DragEvent): void;
    dragover(event: DragEvent): void;
    dragleave(event: DragEvent): void;
    drop(event: DragEvent): void;
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
