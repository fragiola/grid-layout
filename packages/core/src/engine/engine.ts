// The engine: one grid layout on screen (D3). It measures the root, places items in pixels, and
// runs the gestures. A pointer gesture (mouse, touch or pen: one path, D7) moves the item it holds
// itself, once a frame, without React (D8); the other items and the placeholder follow the
// preview, which changes only when the item would land somewhere else. The keyboard grabs, moves,
// resizes and drops an item (D10). A drop brings a new item from outside: from a drag source by
// pointer or keyboard, or a native drag from another window; its preview is the model's dry run
// of `item.add` (X1, X2, X6). Every gesture ends in one command, or none. All DOM access goes
// through the root's document and window (D13).

import { bottom } from "../layout/collision";
import { firstFreeCell } from "../layout/edit";
import {
    cellAt,
    columnWidth,
    containerHeight,
    type GridGeometry,
    itemPixels,
    type PixelRect,
    unitsAt,
} from "../layout/geometry";
import { fitSize } from "../layout/limits";
import { resizeRect, sideEdges } from "../layout/resize";
import type { GridRect, Layout, LayoutItem, ResizeSide } from "../layout/types";
import { rulesOf } from "../model/model";
import type { GridLayoutModel } from "../model/types";
import { DRAG_EXEMPT, PART_ATTRIBUTE } from "./dom";
import type {
    Direction,
    DropItem,
    EngineActionMap,
    EngineQueryMap,
    EngineQuestionMap,
    ExternalDragAnswer,
    ExternalDrop,
    GestureEvent,
    GestureListener,
    GestureSource,
    GestureView,
    GridLayoutEngine,
    GridLayoutEngineOptions,
    GridLayoutView,
} from "./types";

/** The options with their defaults. */
interface Settings {
    readonly width: number | undefined;
    readonly rowHeight: number;
    readonly gap: readonly [number, number];
    readonly padding: readonly [number, number];
    readonly autoSize: boolean;
    readonly draggable: boolean;
    readonly resizable: boolean;
    readonly bounded: boolean;
    readonly threshold: number;
    readonly dir: Direction | undefined;
    readonly onExternalDrag: GridLayoutEngineOptions["onExternalDrag"];
    readonly createId: GridLayoutEngineOptions["createId"];
}

function settingsOf(options: GridLayoutEngineOptions): Settings {
    const gap = options.gap ?? [10, 10];
    return {
        width: options.width,
        rowHeight: options.rowHeight ?? 150,
        gap,
        padding: options.padding ?? gap,
        autoSize: options.autoSize ?? true,
        draggable: options.draggable ?? true,
        resizable: options.resizable ?? true,
        bounded: options.bounded ?? false,
        threshold: options.threshold ?? 3,
        dir: options.dir,
        onExternalDrag: options.onExternalDrag,
        createId: options.createId,
    };
}

/** The id a drop's preview holds when its source names none: the real one is made at the drop. */
const DROP_ID = "grid-layout-drop";

/** A drop item's own fields: its size and limits, nothing else the app's object carries. */
function dropItemOf(item: DropItem): DropItem {
    const own: { -readonly [K in keyof DropItem]: DropItem[K] } = {
        w: item.w,
        h: item.h,
    };
    for (const key of ["minW", "maxW", "minH", "maxH"] as const) {
        if (item[key] !== undefined) own[key] = item[key];
    }
    return own;
}

/** A gesture in progress: what it holds, where it started, where it would land. */
interface Session {
    readonly kind: "move" | "resize" | "keyboard" | "drop";
    readonly source: GestureSource;
    readonly itemId: string;
    readonly side: ResizeSide | undefined;
    /** the layout and the item when it started (a drop's: the new item, wherever it starts) */
    readonly start: Layout;
    readonly before: LayoutItem;
    /** the item's box when it started, logical pixels */
    readonly startRect: PixelRect;
    /** where it would land: the item's cell and size */
    target: GridRect;
    /** the layout if it ended now, the held item in it, and whether the model refuses it */
    preview: Layout;
    landed: LayoutItem;
    refused: boolean;
    /** the pointer is off the grid */
    outside: boolean;
    /** the view's part of it, a new object only when the preview changes */
    view: GestureView;
    /** the element the item is drawn with (a pointer move or resize) */
    readonly element: HTMLElement | undefined;
    /** a drop: what it adds, and the source it started from */
    readonly drop: ExternalDrop | undefined;
    data: unknown;
    readonly origin: HTMLElement | undefined;
    /** a pointer: the pointer, and its offset inside the item when it started (logical) */
    readonly pointerId: number | undefined;
    readonly grab: { readonly x: number; readonly y: number };
    /** the last pointer (or native drag) event, applied at the next frame */
    pending: MouseEvent | undefined;
    frame: number | undefined;
    /** removes what the session listens to */
    readonly cleanup: (() => void)[];
}

/** A press not yet past the threshold: still a click. */
interface Press {
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
    /** what the press is on: an item, a handle, a drag source */
    readonly element: HTMLElement;
    /** the gesture it becomes once the pointer passes the threshold */
    readonly drag: (move: PointerEvent) => void;
    readonly cleanup: (() => void)[];
}

/** What a preview shows: the layout, where the held item lands, whether the model refuses it. */
interface Preview {
    readonly layout: Layout;
    readonly landed: LayoutItem;
    readonly refused: boolean;
}

const ARROWS: Record<string, readonly [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

function sameRect(a: GridRect, b: GridRect): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

const rectOf = (item: GridRect): GridRect => ({
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
});

/** A key that grabs: Space or Enter, without a modifier, and not a held key's repeat. */
const grabs = (event: KeyboardEvent) =>
    (event.key === " " || event.key === "Enter") &&
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey;

function listen<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
): () => void;
function listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
): () => void;
function listen(
    target: EventTarget,
    type: string,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
): () => void {
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
}

/** A grid layout on screen, over `model`. */
export function createGridLayoutEngine(
    model: GridLayoutModel,
    options: GridLayoutEngineOptions = {},
): GridLayoutEngine {
    let settings = settingsOf(options);
    let root: HTMLElement | undefined;
    let measured = 0;
    let dir: Direction = settings.dir ?? "ltr";
    let session: Session | undefined;
    let press: Press | undefined;
    /** a native drag over the root: how deep it is in the root's elements, and the app's answer */
    let native: { depth: number; answer: ExternalDragAnswer } | undefined;
    /** the item a keyboard drop added: focused once its element is registered */
    let focusNext: string | undefined;
    /** ids made without `crypto.randomUUID` (an insecure context) */
    let made = 0;
    /** a gesture's own command is running: the layout changes under it on purpose */
    let committing = false;
    let view: GridLayoutView;
    const items = new Map<string, HTMLElement>();
    const owners = new Map<HTMLElement, string>();
    const dragHandles = new Map<HTMLElement, string>();
    const resizeHandles = new Map<
        HTMLElement,
        { itemId: string; side: ResizeSide }
    >();
    const dragPreviews = new Set<HTMLElement>();
    /** the last pointer a drop followed, for a drag preview mounted after it */
    let pointerAt: { x: number; y: number } | undefined;
    /** the items with a drag handle, a new set when one comes or goes */
    let handled: ReadonlySet<string> = new Set();
    const viewListeners = new Set<() => void>();
    const gestureListeners = new Set<GestureListener>();
    const unsubscribeModel = model.subscribe((event) => {
        if (committing) return;
        // the layout changed under a gesture (the app ran a command): it ends, unapplied; a rule
        // that changed nothing in the layout leaves it going
        if (session && event.before.layouts !== event.after.layouts) {
            cancel(undefined);
        } else {
            update();
        }
    });

    // ─── the view ───────────────────────────────────────────────────────────────────────────

    function geometryOf(): GridGeometry | undefined {
        const width = settings.width ?? measured;
        if (width <= 0) return undefined;
        return {
            width,
            cols: model.state.cols,
            rowHeight: settings.rowHeight,
            gap: settings.gap,
            padding: settings.padding,
        };
    }

    /** The gesture holds an item the engine draws at the pointer itself. */
    const drawn = (current: Session) =>
        current.kind === "move" || current.kind === "resize";

    function computeView(): GridLayoutView {
        const layout = model.get("layout");
        const geometry = geometryOf();
        const shown = session?.preview ?? layout;
        const rects: Record<string, PixelRect> = {};
        if (geometry) {
            for (const item of shown)
                rects[item.id] = itemPixels(geometry, item);
            // the item a pointer holds stays where it started: the engine draws it at the pointer
            if (session && drawn(session)) {
                rects[session.itemId] = session.startRect;
            }
        }
        return {
            items: itemsOf(layout),
            width: geometry?.width ?? 0,
            height:
                geometry && settings.autoSize
                    ? containerHeight(geometry, bottom(shown))
                    : 0,
            dir,
            geometry,
            layout,
            rects,
            gesture: session?.view,
            handled,
            draggable: settings.draggable,
            resizable: settings.resizable,
            dropRefused:
                native?.answer === false ||
                (session?.kind === "drop" && session.refused),
        };
    }

    /** The committed items by id, built once per layout. */
    let indexed:
        | { layout: Layout; items: ReadonlyMap<string, LayoutItem> }
        | undefined;
    function itemsOf(layout: Layout): ReadonlyMap<string, LayoutItem> {
        if (indexed?.layout !== layout) {
            indexed = {
                layout,
                items: new Map(layout.map((item) => [item.id, item])),
            };
        }
        return indexed.items;
    }

    function sameView(a: GridLayoutView, b: GridLayoutView): boolean {
        return (
            a.width === b.width &&
            a.height === b.height &&
            a.dir === b.dir &&
            a.layout === b.layout &&
            a.gesture === b.gesture &&
            a.handled === b.handled &&
            a.draggable === b.draggable &&
            a.resizable === b.resizable &&
            a.dropRefused === b.dropRefused &&
            a.geometry?.cols === b.geometry?.cols &&
            a.geometry?.rowHeight === b.geometry?.rowHeight &&
            a.geometry?.gap[0] === b.geometry?.gap[0] &&
            a.geometry?.gap[1] === b.geometry?.gap[1] &&
            a.geometry?.padding[0] === b.geometry?.padding[0] &&
            a.geometry?.padding[1] === b.geometry?.padding[1]
        );
    }

    /** A new view, told to the adapter, only when it differs. */
    function update(): void {
        const next = computeView();
        if (sameView(view, next)) return;
        view = next;
        for (const listener of [...viewListeners]) listener();
    }

    view = computeView();

    // ─── pixels and direction ───────────────────────────────────────────────────────────────

    function readDirection(): void {
        if (settings.dir) {
            dir = settings.dir;
        } else if (root) {
            const style =
                root.ownerDocument.defaultView?.getComputedStyle(root);
            dir = style?.direction === "rtl" ? "rtl" : "ltr";
        }
    }

    /**
     * The pointer's position inside the root: logical (from the inline-start edge), and top, the
     * root's own scroll included.
     */
    function pointIn(
        clientX: number,
        clientY: number,
        box: DOMRect | undefined = root?.getBoundingClientRect(),
    ): { x: number; y: number } {
        if (!root || !box) return { x: 0, y: 0 };
        // items are placed from the padding box: inside the border
        const left = clientX - box.left - root.clientLeft;
        const top = clientY - box.top - root.clientTop + root.scrollTop;
        const width = view.width;
        return { x: dir === "rtl" ? width - left : left, y: top };
    }

    /**
     * Whether a held item drawn at `rect` (logical, before any bound) is off the grid: its centre
     * past the root's sides or top, or further below what the root shows than its own height
     * with `autoSize` (the grid grows down to follow an item, so its bottom edge is no border).
     * The centre, not the pointer: a pointer overshooting the edge column still lands there.
     */
    function offGrid(rect: PixelRect, box: DOMRect): boolean {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2 - (root?.scrollTop ?? 0);
        const below = settings.autoSize ? rect.height : 0;
        return x < 0 || x > box.width || y < 0 || y > box.height + below;
    }

    /** The structural style of an item at `rect`, physical: what parts and gestures both write. */
    function place(element: HTMLElement, rect: PixelRect): void {
        const left =
            dir === "rtl" ? view.width - rect.left - rect.width : rect.left;
        element.style.transform = `translate(${left}px, ${rect.top}px)`;
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
    }

    /** A drag preview at the pointer, centred on it, moved by the drop's offset. */
    function placePreview(element: HTMLElement): void {
        const drop = session?.drop;
        if (!pointerAt || !drop) return;
        const x = pointerAt.x + (drop.dragOffset?.x ?? 0);
        const y = pointerAt.y + (drop.dragOffset?.y ?? 0);
        element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }

    function emit(
        type: GestureEvent["type"],
        current: Session,
        nativeEvent: Event | undefined,
        ended?: {
            readonly layout: Layout;
            readonly item: LayoutItem;
            readonly target?: Element | null;
        },
    ): void {
        const item = ended?.item ?? current.landed;
        const event: GestureEvent = {
            type,
            source: current.source,
            itemId: current.kind === "drop" ? item.id : current.itemId,
            layout: ended?.layout ?? current.preview,
            before: current.before,
            item,
            nativeEvent,
            external: current.kind === "drop",
            data: current.data,
            outside: current.outside,
            target: ended?.target ?? null,
            origin: current.origin,
        };
        for (const listener of [...gestureListeners]) listener(event);
    }

    // ─── previews ───────────────────────────────────────────────────────────────────────────

    /** The command a gesture ending at `target` runs, or none when it changes nothing. */
    function commandFor(
        current: Session,
        target: GridRect,
        itemId = current.itemId,
    ) {
        const { before } = current;
        if (current.drop) {
            return {
                command: "item.add",
                payload: {
                    item: {
                        ...dropItemOf(current.drop.item),
                        id: itemId,
                        ...target,
                    },
                },
            } as const;
        }
        // a pointer resize from the start or the top moves the item as a consequence: a resize
        const moved =
            current.kind !== "resize" &&
            (target.x !== before.x || target.y !== before.y);
        const sized = target.w !== before.w || target.h !== before.h;
        if (moved && sized) {
            return {
                command: "item.place",
                payload: { itemId, ...target },
            } as const;
        }
        if (moved) {
            return {
                command: "item.move",
                payload: { itemId, x: target.x, y: target.y },
            } as const;
        }
        if (sized) {
            return {
                command: "item.resize",
                payload: {
                    itemId,
                    w: target.w,
                    h: target.h,
                    side: current.side ?? "bottom-end",
                },
            } as const;
        }
        return undefined;
    }

    /** The layout as the gesture found it. */
    const still = (current: Session): Preview => ({
        layout: current.start,
        landed: current.before,
        refused: false,
    });

    /**
     * The layout if `current` ended at `target`, by the model's own dry run (its middleware
     * included): the preview is exactly what the drop commits. A landing the model refuses
     * previews the start, the item going back where it was (a drop: nowhere).
     */
    function previewFor(current: Session, target: GridRect): Preview {
        const call = commandFor(current, target);
        if (!call) return still(current);
        const result = model.check(call.command, call.payload as never);
        if (!result.ok) return { ...still(current), refused: true };
        const value = result.value as {
            readonly item: LayoutItem;
            readonly layout: Layout;
        };
        return { layout: value.layout, landed: value.item, refused: false };
    }

    /** Shows `next`: a new view only when what it shows changed. */
    function show(current: Session, next: Preview, outside: boolean): void {
        const geometry = geometryOf();
        if (
            !geometry ||
            (next.layout === current.preview &&
                next.refused === current.refused &&
                outside === current.outside)
        ) {
            return;
        }
        current.preview = next.layout;
        current.landed = next.landed;
        current.refused = next.refused;
        current.outside = outside;
        current.view = {
            ...current.view,
            preview: next.layout,
            placeholder: itemPixels(geometry, next.landed),
            refused: next.refused,
            outside,
        };
        update();
    }

    /** Moves a pointer session's target to `target`, or off the grid. */
    function retarget(
        current: Session,
        target: GridRect,
        outside: boolean,
    ): void {
        if (sameRect(target, current.target) && outside === current.outside)
            return;
        current.target = target;
        show(
            current,
            outside ? still(current) : previewFor(current, target),
            outside,
        );
    }

    // ─── the gesture's start and end ────────────────────────────────────────────────────────

    function begin(
        kind: Session["kind"],
        source: GestureSource,
        before: LayoutItem,
        extra: {
            readonly side?: ResizeSide;
            readonly pointer?: { id: number; x: number; y: number };
            readonly element?: HTMLElement;
            readonly drop?: ExternalDrop;
            readonly origin?: HTMLElement;
        } = {},
    ): Session | undefined {
        const geometry = geometryOf();
        if (!geometry) return undefined;
        readDirection();
        focusNext = undefined;
        const startRect = itemPixels(geometry, before);
        const start = model.get("layout");
        const { pointer, drop } = extra;
        const grab = pointer ? pointIn(pointer.x, pointer.y) : { x: 0, y: 0 };
        // a drop that follows a pointer is placed by its first frame, off the grid until then
        const outside = kind === "drop" && source !== "keyboard";
        const current: Session = {
            kind,
            source,
            itemId: before.id,
            side: extra.side,
            start,
            before,
            startRect,
            target: rectOf(before),
            preview: start,
            landed: before,
            refused: false,
            outside,
            view: {
                kind,
                source,
                itemId: before.id,
                side: extra.side,
                before,
                preview: start,
                placeholder: startRect,
                outside,
                refused: false,
                data: drop?.data,
                origin: extra.origin,
            },
            element: extra.element,
            drop,
            data: drop?.data,
            origin: extra.origin,
            pointerId: pointer?.id,
            grab: { x: grab.x - startRect.left, y: grab.y - startRect.top },
            pending: undefined,
            frame: undefined,
            cleanup: [],
        };
        session = current;
        update();
        return current;
    }

    /** Ends the session: the item drawn at rest again, and what it listened to removed. */
    function finish(current: Session): void {
        if (current.frame !== undefined && root) {
            root.ownerDocument.defaultView?.cancelAnimationFrame(current.frame);
        }
        for (const remove of current.cleanup) remove();
        session = undefined;
        pointerAt = undefined;
        update();
        // the item the engine moved goes back to the view's box (React's props may not change)
        const rect = view.rects[current.itemId];
        if (current.element && rect && drawn(current)) {
            place(current.element, rect);
        }
    }

    function commit(
        current: Session,
        nativeEvent: Event | undefined,
        target: Element | null = null,
    ): void {
        if (current.kind === "drop") {
            land(current, nativeEvent);
            return;
        }
        const call = commandFor(current, current.target);
        // the command first, then the session ends: the item goes straight to where it landed
        if (call && current.preview !== current.start) {
            committing = true;
            try {
                model.run(call.command, call.payload as never);
            } finally {
                committing = false;
            }
        }
        finish(current);
        const type =
            current.kind === "keyboard"
                ? "drop"
                : current.kind === "move"
                  ? "drag-stop"
                  : "resize-stop";
        emit(type, current, nativeEvent, {
            layout: model.get("layout"),
            item:
                model.get("item-by", { itemId: current.itemId }) ??
                current.before,
            target,
        });
    }

    /** A new item's id: the `createId` option's, else a random UUID from the root's window. */
    function newId(): string {
        if (settings.createId) return settings.createId();
        const host = root?.ownerDocument.defaultView;
        return (
            host?.crypto?.randomUUID?.() ??
            `item-${Date.now().toString(36)}-${++made}`
        );
    }

    /** Ends a drop: one `item.add` where it was shown, or none off the grid or refused. */
    function land(current: Session, nativeEvent: Event | undefined): void {
        let result: ReturnType<typeof model.run<"item.add">> | undefined;
        if (!current.outside && !current.refused) {
            const call = commandFor(
                current,
                current.target,
                current.drop?.itemId ?? newId(),
            );
            committing = true;
            try {
                result = model.run(
                    "item.add",
                    call?.payload as { item: LayoutItem },
                );
            } finally {
                committing = false;
            }
        }
        finish(current);
        const layout = model.get("layout");
        if (!result?.ok) {
            emit(
                current.source === "keyboard" ? "cancel" : "drop-cancel",
                current,
                nativeEvent,
                { layout, item: current.before },
            );
            return;
        }
        const { item } = result.value;
        // a keyboard drop leaves the focus on the new item, to keep moving it
        if (current.source === "keyboard" && !focusItem(item.id)) {
            focusNext = item.id;
        }
        emit("drop", current, nativeEvent, { layout, item });
    }

    function cancel(nativeEvent: Event | undefined): boolean {
        const current = session;
        if (!current) return false;
        finish(current);
        emit(
            current.kind === "drop" && current.source !== "keyboard"
                ? "drop-cancel"
                : "cancel",
            current,
            nativeEvent,
            { layout: model.get("layout"), item: current.before },
        );
        return true;
    }

    // ─── pointer gestures ───────────────────────────────────────────────────────────────────

    /** A box of `size` at `left`/`top`, kept inside the root when the grid is bounded. */
    function bound(
        left: number,
        top: number,
        size: PixelRect,
    ): { left: number; top: number } {
        if (!settings.bounded) return { left, top };
        // the layout's height with autoSize, the root's own otherwise (none: unbounded), down to
        // what its scroll shows
        const height = settings.autoSize
            ? view.height
            : root
              ? root.clientHeight + root.scrollTop
              : 0;
        return {
            left: Math.max(0, Math.min(left, view.width - size.width)),
            top:
                height > 0
                    ? Math.max(
                          0,
                          Math.min(top, Math.max(height - size.height, 0)),
                      )
                    : Math.max(0, top),
        };
    }

    /** The cell an item of `w` × `h` drawn at `left`/`top` lands in, inside the grid. */
    function cellFor(
        geometry: GridGeometry,
        left: number,
        top: number,
        size: { readonly w: number; readonly h: number },
    ): GridRect {
        const rules = rulesOf(model.state);
        const cell = cellAt(geometry, left, top);
        const { w, h } = size;
        return {
            x: Math.max(0, Math.min(cell.x, rules.cols - w)),
            y: Math.max(
                0,
                Math.min(
                    cell.y,
                    (rules.maxRows ?? Number.POSITIVE_INFINITY) - h,
                ),
            ),
            w,
            h,
        };
    }

    /** Applies the last pointer position: the item drawn at it, and the preview retargeted. */
    function frame(current: Session): void {
        current.frame = undefined;
        const event = current.pending;
        const geometry = geometryOf();
        if (!event || !geometry || !root || session !== current) return;
        current.pending = undefined;
        const box = root.getBoundingClientRect();
        const point = pointIn(event.clientX, event.clientY, box);
        const start = current.startRect;
        let outside = false;
        let target: GridRect;
        if (current.kind === "drop") {
            // the new item centred under the pointer, moved by the source's offset (on screen)
            pointerAt = { x: event.clientX, y: event.clientY };
            for (const element of dragPreviews) placePreview(element);
            const offset = current.drop?.dragOffset;
            const dx = (offset?.x ?? 0) * (dir === "rtl" ? -1 : 1);
            const at = {
                ...start,
                left: point.x - start.width / 2 + dx,
                top: point.y - start.height / 2 + (offset?.y ?? 0),
            };
            const { left, top } = bound(at.left, at.top, start);
            target = cellFor(geometry, left, top, current.before);
            outside = offGrid(at, box);
        } else if (current.kind === "move") {
            const at = {
                ...start,
                left: point.x - current.grab.x,
                top: point.y - current.grab.y,
            };
            const { left, top } = bound(at.left, at.top, start);
            if (current.element)
                place(current.element, { ...start, left, top });
            target = cellFor(geometry, left, top, current.before);
            // a bounded item never leaves the grid; off it, an unbounded one goes back
            outside = !settings.bounded && offGrid(at, box);
        } else {
            const { inline, block } = sideEdges(current.side ?? "bottom-end");
            const dx = point.x - current.grab.x - start.left;
            const dy = point.y - current.grab.y - start.top;
            let { left, top, width, height } = start;
            if (inline === "end") width = start.width + dx;
            if (inline === "start") {
                width = start.width - dx;
                left = start.left + dx;
            }
            if (block === "bottom") height = start.height + dy;
            if (block === "top") {
                height = start.height - dy;
                top = start.top + dy;
            }
            if (current.element) {
                place(current.element, {
                    left,
                    top,
                    width: Math.max(width, 0),
                    height: Math.max(height, 0),
                });
            }
            const units = unitsAt(geometry, width, height);
            target = resizeRect(
                current.before,
                current.side ?? "bottom-end",
                units,
                rulesOf(model.state),
            );
        }
        retarget(current, target, outside);
        if (current.kind === "drop") {
            if (!current.outside) emit("drop-over", current, event);
        } else {
            emit(current.kind === "move" ? "drag" : "resize", current, event);
        }
    }

    /**
     * Follows `current`'s pointer through the document: captured on `capture`, a frame at a time,
     * until it is released, cancelled, loses its capture, or Escape.
     */
    function follow(
        current: Session,
        capture: HTMLElement,
        event: PointerEvent,
        type: "drag-start" | "resize-start" | "drop-start",
    ): void {
        if (!root || current.pointerId === undefined) return;
        const doc = root.ownerDocument;
        const pointerId = current.pointerId;
        // a selection made before would follow the pointer as a native drag
        doc.getSelection()?.removeAllRanges();
        try {
            capture.setPointerCapture(pointerId);
        } catch {
            // a pointer already gone (released between frames): the move handler ends it
        }
        current.cleanup.push(
            listen(doc, "pointermove", (move) => {
                if (move.pointerId !== pointerId) return;
                if (move.buttons === 0) {
                    cancel(move);
                    return;
                }
                current.pending = move;
                if (current.frame === undefined) {
                    current.frame = doc.defaultView?.requestAnimationFrame(() =>
                        frame(current),
                    );
                }
            }),
            listen(doc, "pointerup", (up) => {
                if (up.pointerId !== pointerId) return;
                // the release's own position counts, whatever the frame had not drawn yet
                current.pending = up;
                frame(current);
                commit(
                    current,
                    up,
                    current.outside && current.kind === "move"
                        ? elementAt(doc, up, current.element)
                        : null,
                );
                swallowClick(doc);
            }),
            listen(doc, "pointercancel", (gone) => {
                if (gone.pointerId === pointerId) cancel(gone);
            }),
            // the capture lost by its element, or by the document when the element left it (not
            // the implicit capture a touch gave the pressed child, handed over to `capture`)
            listen(doc, "lostpointercapture", (lost) => {
                if (
                    lost.pointerId === pointerId &&
                    (lost.target === capture || lost.target === doc) &&
                    session === current
                ) {
                    cancel(lost);
                }
            }),
            listen(doc, "keydown", (key) => {
                // after the app's handlers, which may keep the gesture going
                if (key.key === "Escape" && !key.defaultPrevented) {
                    key.preventDefault();
                    cancel(key);
                }
            }),
            // no text selection while an item is dragged, and no native drag of one
            listen(doc, "selectstart", (select) => select.preventDefault()),
            listen(doc, "dragstart", (native) => native.preventDefault()),
            () => {
                try {
                    if (capture.hasPointerCapture(pointerId)) {
                        capture.releasePointerCapture(pointerId);
                    }
                } catch {
                    // the element left the document
                }
            },
        );
        emit(type, current, event);
        current.pending = event;
        frame(current);
    }

    /** The element under a release off the grid, past the item drawn there (a trash). */
    function elementAt(
        doc: Document,
        at: MouseEvent,
        held: HTMLElement | undefined,
    ): Element | null {
        if (typeof doc.elementsFromPoint !== "function") return null;
        return (
            doc
                .elementsFromPoint(at.clientX, at.clientY)
                .find((element) => !held?.contains(element)) ?? null
        );
    }

    /** The click a drag's release produces belongs to the drag, not to what is under it. */
    function swallowClick(doc: Document): void {
        const remove = listen(
            doc,
            "click",
            (click) => {
                click.preventDefault();
                click.stopPropagation();
                remove();
            },
            { capture: true },
        );
        doc.defaultView?.setTimeout(remove, 0);
    }

    function endPress(): void {
        if (!press) return;
        for (const remove of press.cleanup) remove();
        press = undefined;
    }

    /** A press on `element`: a click until it passes the threshold, then `drag`. */
    function pressOn(
        event: PointerEvent,
        element: HTMLElement,
        drag: (down: Press, move: PointerEvent) => void,
    ): void {
        if (!root) return;
        endPress();
        const doc = root.ownerDocument;
        const down: Press = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            element,
            drag: (move) => drag(down, move),
            cleanup: [],
        };
        press = down;
        down.cleanup.push(
            // the browser's own drag (a selection, an image) would cancel the pointer: the press
            // is the grid's until it ends or turns out to be a click
            listen(doc, "dragstart", (native) => native.preventDefault()),
            listen(doc, "pointermove", (move) => {
                if (move.pointerId !== down.pointerId) return;
                if (move.buttons === 0) {
                    endPress();
                    return;
                }
                // under the threshold a press is still a click (focus, a button inside the item)
                const distance = Math.hypot(
                    move.clientX - down.x,
                    move.clientY - down.y,
                );
                if (distance < settings.threshold) return;
                endPress();
                down.drag(move);
            }),
            listen(doc, "pointerup", (up) => {
                if (up.pointerId === down.pointerId) endPress();
            }),
            listen(doc, "pointercancel", (gone) => {
                if (gone.pointerId === down.pointerId) endPress();
            }),
        );
    }

    /** What a press on `target` would start: a resize, a drag (from the body or a handle), none. */
    function pressedAt(target: Element):
        | {
              kind: "move" | "resize";
              itemId: string;
              side?: ResizeSide;
              element: HTMLElement;
          }
        | undefined {
        for (
            let element: Element | null = target;
            element && element !== root;
            element = element.parentElement
        ) {
            const html = element as HTMLElement;
            const resize = resizeHandles.get(html);
            if (resize) return { kind: "resize", ...resize, element: html };
            const handleOwner = dragHandles.get(html);
            if (handleOwner)
                return { kind: "move", itemId: handleOwner, element: html };
            const itemId = owners.get(html);
            if (itemId) {
                // an item with a drag handle drags only from it
                const hasHandle = handled.has(itemId);
                return hasHandle
                    ? undefined
                    : { kind: "move", itemId, element: html };
            }
            if (html.matches(DRAG_EXEMPT)) return undefined;
        }
        return undefined;
    }

    function pointerdown(event: PointerEvent): void {
        if (event.defaultPrevented || event.button !== 0 || session || !root)
            return;
        // a drag source inside the grid (in an item) already took this press
        if (press?.pointerId === event.pointerId) return;
        const element = event.target as Element | null;
        if (!element || typeof element.closest !== "function") return;
        // a press inside a grid nested in an item belongs to that grid
        if (element.closest(`[${PART_ATTRIBUTE}="root"]`) !== root) return;
        const pressed = pressedAt(element);
        if (!pressed || !geometryOf()) return;
        const allowedHere =
            pressed.kind === "move"
                ? settings.draggable &&
                  model.is("item-draggable-by", { itemId: pressed.itemId })
                : settings.resizable &&
                  model.is("item-resizable-by", { itemId: pressed.itemId });
        if (!allowedHere) return;
        pressOn(event, pressed.element, (down, move) => {
            const before = model.get("item-by", { itemId: pressed.itemId });
            if (!before) return;
            const current = begin(pressed.kind, "pointer", before, {
                side: pressed.side,
                pointer: { id: down.pointerId, x: down.x, y: down.y },
                element: items.get(pressed.itemId),
            });
            if (!current) return;
            follow(
                current,
                down.element,
                move,
                pressed.kind === "move" ? "drag-start" : "resize-start",
            );
        });
    }

    // ─── drops from outside ─────────────────────────────────────────────────────────────────

    /**
     * The item `drop` adds at `cell`, its size within its limits and the columns. Without an id
     * of its own, it holds a stand-in no item uses until it lands.
     */
    function dropped(
        drop: ExternalDrop,
        cell: { readonly x: number; readonly y: number },
    ): LayoutItem {
        let itemId = drop.itemId ?? DROP_ID;
        while (!drop.itemId && model.get("item-by", { itemId })) itemId += "-";
        const item = dropItemOf(drop.item);
        return {
            ...item,
            id: itemId,
            x: cell.x,
            y: cell.y,
            ...fitSize(item, model.state.cols),
        };
    }

    function startExternalDrag(
        event: PointerEvent,
        source: HTMLElement,
        drop: ExternalDrop,
    ): void {
        if (event.defaultPrevented || event.button !== 0 || session || !root)
            return;
        if (!geometryOf()) return;
        pressOn(event, source, (_down, move) => {
            const before = dropped(drop, { x: 0, y: 0 });
            const current = begin("drop", "pointer", before, {
                pointer: {
                    id: move.pointerId,
                    x: move.clientX,
                    y: move.clientY,
                },
                drop,
                origin: source,
            });
            if (current) follow(current, source, move, "drop-start");
        });
    }

    function startExternalGrab(
        event: KeyboardEvent,
        source: HTMLElement,
        drop: ExternalDrop,
    ): void {
        if (event.defaultPrevented || session || !root || !grabs(event)) return;
        const sized = dropped(drop, { x: 0, y: 0 });
        const cell = firstFreeCell(
            model.get("layout"),
            sized,
            model.state.cols,
        );
        const current = begin(
            "drop",
            "keyboard",
            { ...sized, ...cell },
            {
                drop,
                origin: source,
            },
        );
        if (!current) return;
        event.preventDefault();
        const doc = root.ownerDocument;
        current.cleanup.push(
            // focus leaving the source (a click elsewhere) gives the drop up
            listen(source, "focusout", (blur) => {
                if (session === current) cancel(blur);
            }),
            // the keys come from the source, wherever it is: after the app's handlers
            listen(doc, "keydown", (key) => {
                if (!key.defaultPrevented && session === current)
                    keyboardStep(current, key);
            }),
        );
        // the new item enters where the model puts it, and the next step starts from there
        const entered = previewFor(current, current.target);
        if (!entered.refused) current.target = rectOf(entered.landed);
        show(current, entered, false);
        emit("grab", current, event);
    }

    /** A drag source left the page: what it started ends, unapplied. */
    function releaseSource(source: HTMLElement): void {
        if (press?.element === source) endPress();
        if (session?.origin === source) cancel(undefined);
    }

    /** Accepts or refuses a native drag over the root, as `answer` says. */
    function answerNative(event: DragEvent, answer: ExternalDragAnswer): void {
        if (answer === undefined) return;
        // a drag the grid answers is the grid's: the browser opens no file and shows the effect
        event.preventDefault();
        if (!event.dataTransfer) return;
        if (answer === false) {
            event.dataTransfer.dropEffect = "none";
        } else if (
            /copy|all|uninitialized/i.test(event.dataTransfer.effectAllowed)
        ) {
            event.dataTransfer.dropEffect = "copy";
        }
    }

    /** A drop session for a native drag the app accepts, at the event's position. */
    function beginNative(
        event: DragEvent,
        answer: Exclude<ExternalDragAnswer, false | undefined>,
    ): void {
        const drop = { item: dropItemOf(answer), data: answer.data };
        const current = begin("drop", "native", dropped(drop, { x: 0, y: 0 }), {
            drop,
        });
        if (!current) return;
        emit("drop-start", current, event);
        current.pending = event;
        frame(current);
    }

    /** A native drag entering the root: the app's answer, then a drop session when it accepts. */
    function enterNative(event: DragEvent): void {
        if (session) return;
        const answer = settings.onExternalDrag?.(event);
        native = { depth: 1, answer };
        if (answer) beginNative(event, answer);
        update();
        answerNative(event, answer);
    }

    /** A native drag event on this grid's own elements, not on a grid nested in an item. */
    function own(event: DragEvent): boolean {
        const target = event.target as Element | null;
        return (
            root !== undefined &&
            typeof target?.closest === "function" &&
            target.closest(`[${PART_ATTRIBUTE}="root"]`) === root
        );
    }

    function dragenter(event: DragEvent): void {
        if (!own(event)) return;
        if (!native) {
            enterNative(event);
            return;
        }
        native.depth++;
        answerNative(event, native.answer);
    }

    function dragover(event: DragEvent): void {
        if (!root || !own(event)) return;
        // a drag over before its enter (dispatched alone, or entered while a gesture ran)
        if (!native) {
            enterNative(event);
            return;
        }
        answerNative(event, native.answer);
        // a drop the layout's change ended (an app's command) starts again over the new layout
        if (!session && native.answer) beginNative(event, native.answer);
        const current = session;
        if (current?.source !== "native") return;
        current.pending = event;
        if (current.frame === undefined) {
            current.frame =
                root.ownerDocument.defaultView?.requestAnimationFrame(() =>
                    frame(current),
                );
        }
    }

    function dragleave(event: DragEvent): void {
        if (!native || !own(event)) return;
        native.depth--;
        if (native.depth > 0) return;
        native = undefined;
        if (session?.source === "native") cancel(event);
        else update();
    }

    function drop(event: DragEvent): void {
        if (!native || !own(event)) return;
        const { answer } = native;
        native = undefined;
        const current = session;
        if (answer !== undefined) event.preventDefault();
        if (answer === undefined || current?.source !== "native") {
            update();
            return;
        }
        // asked again: on the drop, the files can be read
        const last = settings.onExternalDrag?.(event);
        if (!last) {
            cancel(event);
            return;
        }
        current.data = last.data;
        current.pending = event;
        frame(current);
        land(current, event);
    }

    // ─── the keyboard ───────────────────────────────────────────────────────────────────────

    /** The item whose tab stop `target` is: the item itself, or one of its drag handles. */
    function tabStopOf(target: EventTarget | null): string | undefined {
        if (!target) return undefined;
        const element = target as HTMLElement;
        return dragHandles.get(element) ?? owners.get(element);
    }

    function keydown(event: KeyboardEvent): void {
        if (event.defaultPrevented) return;
        const current = session;
        if (current && current.kind === "keyboard") {
            keyboardStep(current, event);
            return;
        }
        if (current || !grabs(event)) return;
        const itemId = tabStopOf(event.target);
        if (!itemId) return;
        const movable =
            settings.draggable && model.is("item-draggable-by", { itemId });
        const sizable =
            settings.resizable && model.is("item-resizable-by", { itemId });
        const before = model.get("item-by", { itemId });
        if ((!movable && !sizable) || !before) return;
        const grabbed = begin("keyboard", "keyboard", before);
        if (!grabbed) return;
        event.preventDefault();
        const focused = event.target as HTMLElement;
        grabbed.cleanup.push(
            // focus leaving the item (a click elsewhere) puts it back
            listen(focused, "focusout", (blur) => {
                if (session === grabbed) cancel(blur);
            }),
        );
        emit("grab", grabbed, event);
    }

    /** Whether the keys may move (or size) the held item: a drop's always may. */
    function may(current: Session, change: "move" | "size"): boolean {
        const itemId = current.itemId;
        if (change === "size") {
            return (
                settings.resizable &&
                (current.kind === "drop" ||
                    model.is("item-resizable-by", { itemId }))
            );
        }
        return (
            current.kind === "drop" ||
            (settings.draggable && model.is("item-draggable-by", { itemId }))
        );
    }

    function keyboardStep(current: Session, event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            cancel(event);
            return;
        }
        if (event.key === "Tab") {
            // the focus moves on; the item goes back where it was
            cancel(event);
            return;
        }
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            // a held key's repeat is not a second press
            if (!event.repeat) commit(current, event);
            return;
        }
        const arrow = ARROWS[event.key];
        if (!arrow || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const rules = rulesOf(model.state);
        // arrows are visual: in right-to-left, ArrowRight goes toward the inline start
        const dx = dir === "rtl" ? -arrow[0] : arrow[0];
        const dy = arrow[1];
        const { target, before } = current;
        let next: GridRect;
        if (event.shiftKey) {
            if (!may(current, "size")) return;
            const sized = resizeRect(
                { ...before, x: target.x, y: target.y },
                "bottom-end",
                { w: target.w + dx, h: target.h + dy },
                rules,
            );
            next = { ...target, w: sized.w, h: sized.h };
        } else {
            if (!may(current, "move")) return;
            const maxRows = rules.maxRows ?? Number.POSITIVE_INFINITY;
            next = {
                ...target,
                x: Math.max(0, Math.min(target.x + dx, rules.cols - target.w)),
                y: Math.max(0, Math.min(target.y + dy, maxRows - target.h)),
            };
        }
        // a step the model would refuse (a middleware, a collision) is not taken
        const outcome = previewFor(current, next);
        if (outcome.refused) return;
        const previous = current.landed;
        const landed = outcome.landed;
        // the target is where the item landed (compaction may lift it), so the next step starts
        // from what is shown, and a step that lands nowhere new is not told
        current.target = rectOf(landed);
        show(current, outcome, false);
        if (!sameRect(landed, previous)) {
            emit(event.shiftKey ? "resize" : "move", current, event);
        }
    }

    // ─── the adapter's side ─────────────────────────────────────────────────────────────────

    function registerIn<T>(
        map: Map<HTMLElement, T>,
        element: HTMLElement,
        value: T,
    ) {
        map.set(element, value);
        return () => {
            if (map.get(element) === value) map.delete(element);
        };
    }

    /** Focuses an item's tab stop: its drag handle when it has one. */
    function focusItem(itemId: string): boolean {
        const handle = [...dragHandles].find(
            ([, owner]) => owner === itemId,
        )?.[0];
        const element = handle ?? items.get(itemId);
        if (!element) return false;
        element.focus();
        return true;
    }

    const engine: GridLayoutEngine = {
        get(key, ...[payload]) {
            const queries: {
                [K in keyof EngineQueryMap]: (
                    payload: EngineQueryMap[K]["payload"],
                ) => EngineQueryMap[K]["result"];
            } = {
                gesture: () => session?.view,
                "item-rect-by": ({ itemId }) => view.rects[itemId],
                "cell-at": ({ clientX, clientY }) => {
                    const geometry = geometryOf();
                    if (!geometry) return undefined;
                    const point = pointIn(clientX, clientY);
                    // the cell whose box (with the gap after it) holds the point
                    const x = Math.floor(
                        (point.x - geometry.padding[0]) /
                            (columnWidth(geometry) + geometry.gap[0]),
                    );
                    const y = Math.floor(
                        (point.y - geometry.padding[1]) /
                            (geometry.rowHeight + geometry.gap[1]),
                    );
                    return {
                        x: Math.max(0, Math.min(x, geometry.cols - 1)),
                        y: Math.max(0, y),
                    };
                },
                geometry: () => geometryOf(),
                dir: () => dir,
            };
            const query = queries[key] as (
                payload: unknown,
            ) => EngineQueryMap[typeof key]["result"];
            return query(payload);
        },
        run(action, ...[payload]) {
            const actions: {
                [K in keyof EngineActionMap]: (
                    payload: EngineActionMap[K]["payload"],
                ) => EngineActionMap[K]["result"];
            } = {
                "cancel-gesture": () => cancel(undefined),
                "focus-item": ({ itemId }) => focusItem(itemId),
            };
            const run = actions[action] as (
                payload: unknown,
            ) => EngineActionMap[typeof action]["result"];
            return run(payload);
        },
        is(key, payload) {
            const questions: {
                [K in keyof EngineQuestionMap]: (
                    payload: EngineQuestionMap[K],
                ) => boolean;
            } = {
                "item-active-by": ({ itemId }) => session?.itemId === itemId,
            };
            return questions[key](payload);
        },
        subscribe(listener) {
            gestureListeners.add(listener);
            return () => {
                gestureListeners.delete(listener);
            };
        },
        destroy() {
            cancel(undefined);
            endPress();
            native = undefined;
            unsubscribeModel();
            viewListeners.clear();
            gestureListeners.clear();
            items.clear();
            owners.clear();
            dragHandles.clear();
            resizeHandles.clear();
            dragPreviews.clear();
        },
        adapter: {
            attach(element) {
                root = element;
                measured = Math.round(element.clientWidth);
                readDirection();
                update();
                const host = element.ownerDocument.defaultView;
                const Observer = host?.ResizeObserver;
                let frameId: number | undefined;
                const observer = Observer
                    ? new Observer(() => {
                          // once a frame: a resize storm measures once (react-grid-layout#1959)
                          if (frameId !== undefined) return;
                          frameId = host?.requestAnimationFrame(() => {
                              frameId = undefined;
                              if (root !== element) return;
                              measured = Math.round(element.clientWidth);
                              readDirection();
                              update();
                          });
                      })
                    : undefined;
                observer?.observe(element);
                return () => {
                    observer?.disconnect();
                    if (frameId !== undefined)
                        host?.cancelAnimationFrame(frameId);
                    if (root === element) {
                        cancel(undefined);
                        endPress();
                        native = undefined;
                        root = undefined;
                    }
                };
            },
            registerItem(itemId, element) {
                items.set(itemId, element);
                const unown = registerIn(owners, element, itemId);
                if (focusNext === itemId && focusItem(itemId)) {
                    focusNext = undefined;
                }
                return () => {
                    unown();
                    if (items.get(itemId) === element) items.delete(itemId);
                };
            },
            registerDragHandle(itemId, element) {
                const unregister = registerIn(dragHandles, element, itemId);
                const refresh = () => {
                    handled = new Set(dragHandles.values());
                    update();
                };
                refresh();
                return () => {
                    unregister();
                    refresh();
                };
            },
            registerResizeHandle(itemId, side, element) {
                return registerIn(resizeHandles, element, { itemId, side });
            },
            registerDragPreview(element) {
                dragPreviews.add(element);
                placePreview(element);
                return () => {
                    dragPreviews.delete(element);
                };
            },
            getView: () => view,
            subscribe(listener) {
                viewListeners.add(listener);
                return () => {
                    viewListeners.delete(listener);
                };
            },
            pointerdown,
            keydown,
            setOptions(next) {
                const before = settings;
                settings = settingsOf(next);
                if (settings.dir !== before.dir) readDirection();
                update();
            },
            startExternalDrag,
            startExternalGrab,
            releaseSource,
            dragenter,
            dragover,
            dragleave,
            drop,
        },
    };
    return engine;
}
