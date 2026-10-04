// The engine: one grid layout on screen (D3). It measures the root, places items in pixels, and
// runs the gestures. A pointer gesture (mouse, touch or pen: one path, D7) moves the item it holds
// itself, once a frame, without React (D8); the other items and the placeholder follow the
// preview, which changes only when the item would land somewhere else. The keyboard grabs, moves,
// resizes and drops an item (D10). Every gesture ends in one command, or none. All DOM access goes
// through the root's document and window (D13).

import { bottom } from "../layout/collision";
import { placeItem, resizeItem } from "../layout/edit";
import {
    cellAt,
    columnWidth,
    containerHeight,
    type GridGeometry,
    itemPixels,
    type PixelRect,
    unitsAt,
} from "../layout/geometry";
import { resizeRect, sideEdges } from "../layout/resize";
import type { GridRect, Layout, LayoutItem, ResizeSide } from "../layout/types";
import { rulesOf } from "../model/model";
import type { GridLayoutModel } from "../model/types";
import { DRAG_EXEMPT, PART_ATTRIBUTE } from "./dom";
import type {
    Direction,
    EngineActionMap,
    EngineQueryMap,
    EngineQuestionMap,
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
    };
}

/** A gesture in progress: what it holds, where it started, where it would land. */
interface Session {
    readonly kind: "move" | "resize" | "keyboard";
    readonly source: GestureSource;
    readonly itemId: string;
    readonly side: ResizeSide | undefined;
    /** the layout and the item when it started */
    readonly start: Layout;
    readonly before: LayoutItem;
    /** the item's box when it started, logical pixels */
    readonly startRect: PixelRect;
    /** where it would land: the item's cell and size */
    target: GridRect;
    /** the layout if it ended now */
    preview: Layout;
    /** the view's part of it, a new object only when the preview changes */
    view: GestureView;
    /** the element the item is drawn with */
    readonly element: HTMLElement | undefined;
    /** a pointer: the pointer, and its offset inside the item when it started (logical) */
    readonly pointerId: number | undefined;
    readonly grab: { readonly x: number; readonly y: number };
    /** the last pointer event, applied at the next frame */
    pending: PointerEvent | undefined;
    frame: number | undefined;
    /** removes what the session listens to */
    readonly cleanup: (() => void)[];
}

/** A press not yet past the threshold: still a click. */
interface Press {
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
    readonly itemId: string;
    readonly kind: "move" | "resize";
    readonly side: ResizeSide | undefined;
    readonly element: HTMLElement;
    readonly cleanup: (() => void)[];
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
    /** the items with a drag handle, a new set when one comes or goes */
    let handled: ReadonlySet<string> = new Set();
    const viewListeners = new Set<() => void>();
    const gestureListeners = new Set<GestureListener>();
    const unsubscribeModel = model.subscribe(() => {
        if (committing) return;
        if (session) {
            // the layout changed under a gesture (the app ran a command): it ends, unapplied
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

    function computeView(): GridLayoutView {
        const layout = model.get("layout");
        const geometry = geometryOf();
        const shown = session?.preview ?? layout;
        const rects: Record<string, PixelRect> = {};
        if (geometry) {
            for (const item of shown)
                rects[item.id] = itemPixels(geometry, item);
            // the item a pointer holds stays where it started: the engine draws it at the pointer
            if (session && session.kind !== "keyboard") {
                rects[session.itemId] = session.startRect;
            }
        }
        return {
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
        };
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

    /** The pointer's position inside the root: logical (from the inline-start edge), and top. */
    function pointIn(
        clientX: number,
        clientY: number,
    ): { x: number; y: number } {
        if (!root) return { x: 0, y: 0 };
        const box = root.getBoundingClientRect();
        // items are placed from the padding box: inside the border
        const left = clientX - box.left - root.clientLeft;
        const top = clientY - box.top - root.clientTop;
        const width = view.width;
        return { x: dir === "rtl" ? width - left : left, y: top };
    }

    /** The structural style of an item at `rect`, physical: what parts and gestures both write. */
    function place(element: HTMLElement, rect: PixelRect): void {
        const left =
            dir === "rtl" ? view.width - rect.left - rect.width : rect.left;
        element.style.transform = `translate(${left}px, ${rect.top}px)`;
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
    }

    function emit(
        type: GestureEvent["type"],
        current: Session,
        layout: Layout,
        nativeEvent: Event | undefined,
    ): void {
        const item =
            layout.find((entry) => entry.id === current.itemId) ??
            current.before;
        const event: GestureEvent = {
            type,
            source: current.source,
            itemId: current.itemId,
            layout,
            before: current.before,
            item,
            nativeEvent,
        };
        for (const listener of [...gestureListeners]) listener(event);
    }

    // ─── previews ───────────────────────────────────────────────────────────────────────────

    /** The command a gesture ending at `target` runs, or none when it changes nothing. */
    function commandFor(current: Session, target: GridRect) {
        const { before } = current;
        // a pointer resize from the start or the top moves the item as a consequence: a resize
        const moved =
            current.kind !== "resize" &&
            (target.x !== before.x || target.y !== before.y);
        const sized = target.w !== before.w || target.h !== before.h;
        const itemId = current.itemId;
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

    /** Whether the model would take the gesture ending at `target` (its middleware included). */
    function allowed(current: Session, target: GridRect): boolean {
        const call = commandFor(current, target);
        if (!call) return true;
        return model.can(call.command, call.payload as never);
    }

    /** The layout if `current` ended at `target`: computed from where the gesture started. */
    function previewFor(current: Session, target: GridRect): Layout {
        const rules = rulesOf(model.state);
        const { start, itemId } = current;
        // the same layout functions the commands run, so the preview is what gets committed
        if (current.kind === "resize") {
            const size = { w: target.w, h: target.h };
            return resizeItem(
                start,
                itemId,
                size,
                current.side ?? "bottom-end",
                rules,
            );
        }
        return placeItem(start, itemId, target, rules);
    }

    /** Moves the session's target to `target`, refreshing the preview when it lands elsewhere. */
    function retarget(current: Session, target: GridRect): boolean {
        if (sameRect(target, current.target)) return false;
        const geometry = geometryOf();
        if (!geometry) return false;
        current.target = target;
        // a refused landing shows the item going back where it was
        const preview = allowed(current, target)
            ? previewFor(current, target)
            : current.start;
        if (preview !== current.preview) {
            current.preview = preview;
            const landed =
                preview.find((item) => item.id === current.itemId) ??
                current.before;
            current.view = {
                ...current.view,
                preview,
                placeholder: itemPixels(geometry, landed),
            };
            update();
        }
        return true;
    }

    // ─── the gesture's start and end ────────────────────────────────────────────────────────

    function begin(
        kind: Session["kind"],
        source: GestureSource,
        itemId: string,
        side: ResizeSide | undefined,
        pointer: { id: number; x: number; y: number } | undefined,
    ): Session | undefined {
        const geometry = geometryOf();
        const before = model.get("item-by", { itemId });
        if (!geometry || !before) return undefined;
        readDirection();
        const startRect = itemPixels(geometry, before);
        const start = model.get("layout");
        const grab = pointer ? pointIn(pointer.x, pointer.y) : { x: 0, y: 0 };
        const element = items.get(itemId);
        const current: Session = {
            kind,
            source,
            itemId,
            side,
            start,
            before,
            startRect,
            target: { x: before.x, y: before.y, w: before.w, h: before.h },
            preview: start,
            view: {
                kind,
                source,
                itemId,
                side,
                before,
                preview: start,
                placeholder: startRect,
            },
            element,
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
        update();
        // the item the engine moved goes back to the view's box (React's props may not change)
        const rect = view.rects[current.itemId];
        if (current.element && rect && current.kind !== "keyboard") {
            place(current.element, rect);
        }
    }

    function commit(current: Session, nativeEvent: Event | undefined): void {
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
        emit(type, current, model.get("layout"), nativeEvent);
    }

    function cancel(nativeEvent: Event | undefined): boolean {
        const current = session;
        if (!current) return false;
        finish(current);
        emit("cancel", current, model.get("layout"), nativeEvent);
        return true;
    }

    // ─── pointer gestures ───────────────────────────────────────────────────────────────────

    /** Applies the last pointer position: the item drawn at it, and the preview retargeted. */
    function frame(current: Session): void {
        current.frame = undefined;
        const event = current.pending;
        const geometry = geometryOf();
        if (!event || !geometry || session !== current) return;
        current.pending = undefined;
        const point = pointIn(event.clientX, event.clientY);
        const start = current.startRect;
        const rules = rulesOf(model.state);
        let rect: PixelRect;
        let target: GridRect;
        if (current.kind === "move") {
            let left = point.x - current.grab.x;
            let top = point.y - current.grab.y;
            if (settings.bounded) {
                left = Math.max(0, Math.min(left, view.width - start.width));
                // the layout's height with autoSize, the root's own otherwise (none: unbounded)
                const height = settings.autoSize
                    ? view.height
                    : (root?.clientHeight ?? 0);
                top =
                    height > 0
                        ? Math.max(
                              0,
                              Math.min(top, Math.max(height - start.height, 0)),
                          )
                        : Math.max(0, top);
            }
            rect = { ...start, left, top };
            const cell = cellAt(geometry, left, top);
            const { w, h } = current.before;
            target = {
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
            rect = {
                left,
                top,
                width: Math.max(width, 0),
                height: Math.max(height, 0),
            };
            const units = unitsAt(geometry, width, height);
            target = resizeRect(
                current.before,
                current.side ?? "bottom-end",
                units,
                rules,
            );
        }
        if (current.element) place(current.element, rect);
        retarget(current, target);
        emit(
            current.kind === "move" ? "drag" : "resize",
            current,
            current.preview,
            event,
        );
    }

    function startPointerSession(down: Press, event: PointerEvent): void {
        const current = begin(down.kind, "pointer", down.itemId, down.side, {
            id: down.pointerId,
            x: down.x,
            y: down.y,
        });
        if (!current || !root) return;
        const doc = root.ownerDocument;
        const element = down.element;
        try {
            element.setPointerCapture(down.pointerId);
        } catch {
            // a pointer already gone (released between frames): the move handler ends it
        }
        current.cleanup.push(
            listen(doc, "pointermove", (move) => {
                if (move.pointerId !== current.pointerId) return;
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
                if (up.pointerId !== current.pointerId) return;
                // the release's own position counts, whatever the frame had not drawn yet
                current.pending = up;
                frame(current);
                commit(current, up);
                swallowClick(doc);
            }),
            listen(doc, "pointercancel", (gone) => {
                if (gone.pointerId === current.pointerId) cancel(gone);
            }),
            listen(element, "lostpointercapture", (lost) => {
                if (lost.pointerId === current.pointerId && session === current)
                    cancel(lost);
            }),
            listen(doc, "keydown", (key) => {
                // after the app's handlers, which may keep the gesture going
                if (key.key === "Escape" && !key.defaultPrevented) {
                    key.preventDefault();
                    cancel(key);
                }
            }),
            // no text selection while an item is dragged
            listen(doc, "selectstart", (select) => select.preventDefault()),
            () => {
                try {
                    if (element.hasPointerCapture(down.pointerId)) {
                        element.releasePointerCapture(down.pointerId);
                    }
                } catch {
                    // the element left the document
                }
            },
        );
        emit(
            down.kind === "move" ? "drag-start" : "resize-start",
            current,
            current.start,
            event,
        );
        current.pending = event;
        frame(current);
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
        endPress();
        const doc = root.ownerDocument;
        const down: Press = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            itemId: pressed.itemId,
            kind: pressed.kind,
            side: pressed.side,
            element: pressed.element,
            cleanup: [],
        };
        press = down;
        down.cleanup.push(
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
                startPointerSession(down, move);
            }),
            listen(doc, "pointerup", (up) => {
                if (up.pointerId === down.pointerId) endPress();
            }),
            listen(doc, "pointercancel", (gone) => {
                if (gone.pointerId === down.pointerId) endPress();
            }),
        );
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
        if (current) return;
        if (event.key !== " " && event.key !== "Enter") return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const itemId = tabStopOf(event.target);
        if (!itemId) return;
        const movable =
            settings.draggable && model.is("item-draggable-by", { itemId });
        const sizable =
            settings.resizable && model.is("item-resizable-by", { itemId });
        if (!movable && !sizable) return;
        const grabbed = begin(
            "keyboard",
            "keyboard",
            itemId,
            undefined,
            undefined,
        );
        if (!grabbed) return;
        event.preventDefault();
        const focused = event.target as HTMLElement;
        grabbed.cleanup.push(
            // focus leaving the item (a click elsewhere) puts it back
            listen(focused, "focusout", (blur) => {
                if (session === grabbed) cancel(blur);
            }),
        );
        emit("grab", grabbed, grabbed.start, event);
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
            commit(current, event);
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
            if (
                !(
                    settings.resizable &&
                    model.is("item-resizable-by", { itemId: current.itemId })
                )
            ) {
                return;
            }
            const sized = resizeRect(
                { ...before, x: target.x, y: target.y },
                "bottom-end",
                { w: target.w + dx, h: target.h + dy },
                rules,
            );
            next = { ...target, w: sized.w, h: sized.h };
        } else {
            if (
                !(
                    settings.draggable &&
                    model.is("item-draggable-by", { itemId: current.itemId })
                )
            ) {
                return;
            }
            const maxRows = rules.maxRows ?? Number.POSITIVE_INFINITY;
            next = {
                ...target,
                x: Math.max(0, Math.min(target.x + dx, rules.cols - target.w)),
                y: Math.max(0, Math.min(target.y + dy, maxRows - target.h)),
            };
        }
        // a step the model would refuse (a middleware, a collision) is not taken
        if (!allowed(current, next)) return;
        if (retarget(current, next)) {
            emit(
                event.shiftKey ? "resize" : "move",
                current,
                current.preview,
                event,
            );
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
                "focus-item": ({ itemId }) => {
                    const handle = [...dragHandles].find(
                        ([, owner]) => owner === itemId,
                    )?.[0];
                    const element = handle ?? items.get(itemId);
                    if (!element) return false;
                    element.focus();
                    return true;
                },
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
            unsubscribeModel();
            viewListeners.clear();
            gestureListeners.clear();
            items.clear();
            owners.clear();
            dragHandles.clear();
            resizeHandles.clear();
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
                        root = undefined;
                    }
                };
            },
            registerItem(itemId, element) {
                items.set(itemId, element);
                const unown = registerIn(owners, element, itemId);
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
        },
    };
    return engine;
}
