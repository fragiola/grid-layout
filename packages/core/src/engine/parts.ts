// What each part of a grid layout is, as pure functions of the view: its state, the `data-*`
// attributes that expose it (present or absent, never "false"), and its structural style (D4, D5).
// An adapter maps them onto elements and adds nothing.

import type { PixelRect } from "../layout/geometry";
import type { LayoutItem, ResizeSide } from "../layout/types";
import { ITEM_ATTRIBUTE, PART_ATTRIBUTE } from "./dom";
import type { GridLayoutView } from "./types";

/** The style a part needs to work: where it is, how big, what is on top. Nothing cosmetic. */
export interface StructuralStyle {
    readonly position?: "relative" | "absolute" | "fixed";
    readonly top?: number;
    readonly left?: number;
    readonly width?: number;
    readonly height?: number;
    readonly transform?: string;
    readonly boxSizing?: "border-box";
    /** the item a gesture holds stays above the others */
    readonly zIndex?: number;
    /** a handle's touch gestures are drags, never scrolls (D7) */
    readonly touchAction?: "none";
    /** a placeholder and a drag preview never take the pointer */
    readonly pointerEvents?: "none";
}

/** A part: its state, its attributes, its structural style. */
export interface Part<S> {
    readonly state: S;
    readonly attributes: Readonly<Record<string, string>>;
    readonly style: StructuralStyle;
}

/** `true` as an empty attribute, `false` as none. */
function flags(values: Record<string, boolean>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, on] of Object.entries(values)) if (on) out[name] = "";
    return out;
}

/** A box's style, physical: mirrored from the inline-start edge in right-to-left. */
function boxStyle(view: GridLayoutView, rect: PixelRect): StructuralStyle {
    const left =
        view.dir === "rtl" ? view.width - rect.left - rect.width : rect.left;
    return {
        position: "absolute",
        top: 0,
        left: 0,
        width: rect.width,
        height: rect.height,
        transform: `translate(${left}px, ${rect.top}px)`,
        boxSizing: "border-box",
    };
}

/** The root's state. */
export interface RootState {
    /** a pointer is moving an item */
    readonly dragging: boolean;
    /** a pointer is resizing an item */
    readonly resizing: boolean;
    /** the keyboard holds an item */
    readonly grabbed: boolean;
    /** a new item from outside is over the grid */
    readonly dropping: boolean;
    /** an external drag over the grid would not drop */
    readonly dropRefused: boolean;
    /** the pointer holding an item or bringing one is off the grid */
    readonly outside: boolean;
    /** the active breakpoint (`data-breakpoint`) */
    readonly breakpoint: string;
    readonly dir: "ltr" | "rtl";
}

/** The root: the positioned box the items are placed in, as tall as the layout with `autoSize`. */
export function rootPart(view: GridLayoutView): Part<RootState> {
    const gesture = view.gesture;
    const kind = gesture?.kind;
    const outside = gesture?.outside === true;
    const state: RootState = {
        dragging: kind === "move",
        resizing: kind === "resize",
        grabbed: kind === "keyboard",
        dropping: kind === "drop" && !outside,
        dropRefused: view.dropRefused && !outside,
        outside,
        breakpoint: view.breakpoint,
        dir: view.dir,
    };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "root",
            "data-breakpoint": state.breakpoint,
            ...flags({
                "data-dragging": state.dragging,
                "data-resizing": state.resizing,
                "data-grabbed": state.grabbed,
                "data-dropping": state.dropping,
                "data-drop-refused": state.dropRefused,
                "data-outside": state.outside,
            }),
        },
        style:
            view.height > 0
                ? { position: "relative", height: view.height }
                : { position: "relative" },
    };
}

/** An item's state. */
export interface ItemState {
    readonly itemId: string;
    /** the item, as committed; `undefined` for an id the layout does not hold */
    readonly item: LayoutItem | undefined;
    /** a pointer moves it */
    readonly dragging: boolean;
    /** a pointer resizes it */
    readonly resizing: boolean;
    /** the keyboard holds it */
    readonly grabbed: boolean;
    /** a pointer holds it off the grid: released there, it stays where it was */
    readonly outside: boolean;
    readonly static: boolean;
    /** people may drag it now (the grid's and its own setting) */
    readonly draggable: boolean;
    /** people may resize it now */
    readonly resizable: boolean;
    /** it has a drag handle: the handle, not the item, is the tab stop */
    readonly handled: boolean;
    /** its box is known (the root is measured) */
    readonly placed: boolean;
}

/** An item: placed at its box, above the others while a gesture holds it. */
export function itemPart(
    view: GridLayoutView,
    itemId: string,
): Part<ItemState> & { readonly tabIndex: number } {
    const item = view.items.get(itemId);
    // a drop holds a new item, never one of these (even under an id the layout already has)
    const gesture =
        view.gesture?.itemId === itemId && view.gesture.kind !== "drop"
            ? view.gesture
            : undefined;
    const isStatic = item?.static === true;
    const state: ItemState = {
        itemId,
        item,
        dragging: gesture?.kind === "move",
        resizing: gesture?.kind === "resize",
        grabbed: gesture?.kind === "keyboard",
        outside: gesture?.outside === true,
        static: isStatic,
        draggable:
            view.draggable &&
            item !== undefined &&
            !isStatic &&
            item.draggable !== false,
        resizable:
            view.resizable &&
            item !== undefined &&
            !isStatic &&
            item.resizable !== false,
        handled: view.handled.has(itemId),
        placed: view.rects[itemId] !== undefined,
    };
    const rect = view.rects[itemId];
    const style: StructuralStyle = rect
        ? { ...boxStyle(view, rect), ...(gesture ? { zIndex: 1 } : {}) }
        : { position: "absolute", top: 0, left: 0, boxSizing: "border-box" };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "item",
            [ITEM_ATTRIBUTE]: itemId,
            ...flags({
                "data-dragging": state.dragging,
                "data-resizing": state.resizing,
                "data-grabbed": state.grabbed,
                "data-outside": state.outside,
                "data-static": state.static,
                "data-draggable": state.draggable,
                "data-resizable": state.resizable,
            }),
        },
        style,
        // the tab stop is the item, or its drag handle when it has one (D10)
        tabIndex: state.handled ? -1 : 0,
    };
}

/** A drag handle's state. */
export interface DragHandleState {
    readonly itemId: string;
    /** a pointer moves its item */
    readonly dragging: boolean;
    /** the keyboard holds its item */
    readonly grabbed: boolean;
    /** its item can be dragged now */
    readonly draggable: boolean;
}

/** A drag handle: the only place its item drags from, and its tab stop. */
export function dragHandlePart(
    view: GridLayoutView,
    itemId: string,
): Part<DragHandleState> & { readonly tabIndex: number } {
    const item = itemPart(view, itemId).state;
    const state: DragHandleState = {
        itemId,
        dragging: item.dragging,
        grabbed: item.grabbed,
        draggable: item.draggable,
    };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "drag-handle",
            ...flags({
                "data-dragging": state.dragging,
                "data-grabbed": state.grabbed,
                "data-draggable": state.draggable,
            }),
        },
        style: { touchAction: "none" },
        tabIndex: 0,
    };
}

/** A resize handle's state. */
export interface ResizeHandleState {
    readonly itemId: string;
    readonly side: ResizeSide;
    /** a pointer pulls this handle */
    readonly resizing: boolean;
    /** its item can be resized now: when not, the handle renders nothing */
    readonly resizable: boolean;
}

/** A resize handle: a side or corner its item is resized from. */
export function resizeHandlePart(
    view: GridLayoutView,
    itemId: string,
    side: ResizeSide,
): Part<ResizeHandleState> {
    const item = itemPart(view, itemId).state;
    const gesture = view.gesture;
    const state: ResizeHandleState = {
        itemId,
        side,
        resizing:
            gesture?.kind === "resize" &&
            gesture.itemId === itemId &&
            gesture.side === side,
        resizable: item.resizable,
    };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "resize-handle",
            "data-side": side,
            ...flags({ "data-resizing": state.resizing }),
        },
        style: { touchAction: "none" },
    };
}

/** The placeholder's state, while a gesture is in progress. */
export interface PlaceholderState {
    readonly itemId: string;
    readonly kind: "move" | "resize" | "keyboard" | "drop";
}

/**
 * Where the held item would land: present only during a gesture, and for a drop only while it
 * would land somewhere (over the grid, not refused).
 */
export function placeholderPart(
    view: GridLayoutView,
): Part<PlaceholderState> | undefined {
    const gesture = view.gesture;
    if (!gesture) return undefined;
    if (gesture.kind === "drop" && (gesture.outside || gesture.refused))
        return undefined;
    return {
        state: { itemId: gesture.itemId, kind: gesture.kind },
        attributes: {
            [PART_ATTRIBUTE]: "placeholder",
            "data-kind": gesture.kind,
        },
        style: {
            ...boxStyle(view, gesture.placeholder),
            pointerEvents: "none",
        },
    };
}

/** A drag source's state. */
export interface DragSourceState {
    /** a pointer brings its item */
    readonly dragging: boolean;
    /** the keyboard holds its item in the grid */
    readonly grabbed: boolean;
    /** it starts nothing */
    readonly disabled: boolean;
}

/**
 * A drag source: an element anywhere on the page whose press or Space/Enter brings a new item
 * into the grid (X1, X6). `view` is `undefined` until a grid is reachable.
 */
export function dragSourcePart(
    view: GridLayoutView | undefined,
    source: Element | null,
    disabled: boolean,
): Part<DragSourceState> & { readonly tabIndex: number } {
    const gesture = view?.gesture;
    const mine =
        gesture?.kind === "drop" &&
        source !== null &&
        gesture.origin === source;
    const state: DragSourceState = {
        dragging: mine && gesture.source === "pointer",
        grabbed: mine && gesture.source === "keyboard",
        disabled,
    };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "drag-source",
            ...flags({
                "data-dragging": state.dragging,
                "data-grabbed": state.grabbed,
                "data-disabled": state.disabled,
            }),
        },
        style: { touchAction: "none" },
        tabIndex: disabled ? -1 : 0,
    };
}

/** The drag preview's state, while a pointer brings a new item. */
export interface DragPreviewState {
    /** the item's id in the preview */
    readonly itemId: string;
    /** the drop's data, as its source gave it */
    readonly data: unknown;
    /** the pointer is over the grid */
    readonly over: boolean;
    /** the grid would not take it there */
    readonly refused: boolean;
}

/**
 * What follows the pointer while it brings a new item: present only during a pointer drop. The
 * engine keeps it at the pointer (its `transform`); its look is the app's.
 */
export function dragPreviewPart(
    view: GridLayoutView | undefined,
): Part<DragPreviewState> | undefined {
    const gesture = view?.gesture;
    if (gesture?.kind !== "drop" || gesture.source !== "pointer")
        return undefined;
    const state: DragPreviewState = {
        itemId: gesture.itemId,
        data: gesture.data,
        over: !gesture.outside,
        refused: gesture.refused && !gesture.outside,
    };
    return {
        state,
        attributes: {
            [PART_ATTRIBUTE]: "drag-preview",
            ...flags({
                "data-over": state.over,
                "data-drop-refused": state.refused,
            }),
        },
        style: {
            position: "fixed",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 1,
        },
    };
}
