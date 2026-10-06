// The engine: one grid layout on screen (D3). It measures the root, places items in pixels, and
// runs the gestures. A pointer gesture (mouse, touch or pen: one path, D7) moves the item it holds
// itself, once a frame, without React (D8); the other items and the placeholder follow the
// preview, which changes only when the item would land somewhere else. The keyboard grabs, moves,
// resizes and drops an item (D10). A drop brings a new item from outside: from a drag source by
// pointer or keyboard, or a native drag from another window; its preview is the model's dry run
// of `item.add` (X1, X2, X6). Every gesture ends in one command, or none, and its preview is that
// command's dry run with the same pixels (`env`), so the constraints shape both alike (K1, K2). A
// grid in a CSS-scaled parent reads the scale off its own box (K5). All DOM access goes through
// the root's document and window (D13).

import { bottom } from "../layout/collision";
import {
    type ConstraintEnv,
    constrainMove,
    constrainResize,
} from "../layout/constraints";
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
import { resizeRect, sideEdges } from "../layout/resize";
import { valueAt } from "../layout/responsive";
import type { GridRect, Layout, LayoutItem, ResizeSide } from "../layout/types";
import { sameRect } from "../layout/working";
import { rulesOf } from "../model/model";
import type { GridLayoutModel } from "../model/types";
import { DRAG_EXEMPT, PART_ATTRIBUTE, PRESSING_ATTRIBUTE } from "./dom";
import { cellRowCount, gridCells } from "./parts";
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
    PerBreakpoint,
} from "./types";

/** The options with their defaults. */
interface Settings {
    readonly width: number | undefined;
    readonly rowHeight: PerBreakpoint<number>;
    readonly gap: PerBreakpoint<readonly [number, number]>;
    readonly padding: PerBreakpoint<readonly [number, number]> | undefined;
    readonly breakpoint: string | undefined;
    readonly autoSize: boolean;
    readonly draggable: boolean;
    readonly resizable: boolean;
    readonly bounded: boolean;
    readonly threshold: number;
    readonly touchDelay: number;
    readonly touchTolerance: number;
    readonly autoScroll:
        | { readonly threshold: number; readonly speed: number }
        | undefined;
    readonly dir: Direction | undefined;
    readonly scale: number | undefined;
    readonly onExternalDrag: GridLayoutEngineOptions["onExternalDrag"];
    readonly createId: GridLayoutEngineOptions["createId"];
}

function settingsOf(options: GridLayoutEngineOptions): Settings {
    return {
        width: options.width,
        rowHeight: options.rowHeight ?? DEFAULT_ROW_HEIGHT,
        gap: options.gap ?? DEFAULT_GAP,
        padding: options.padding,
        breakpoint: options.breakpoint,
        autoSize: options.autoSize ?? true,
        draggable: options.draggable ?? true,
        resizable: options.resizable ?? true,
        bounded: options.bounded ?? false,
        threshold: options.threshold ?? 3,
        touchDelay: options.touchDelay ?? 250,
        touchTolerance: options.touchTolerance ?? 5,
        autoScroll:
            options.autoScroll === false
                ? undefined
                : {
                      threshold: options.autoScroll?.threshold ?? 40,
                      speed: options.autoScroll?.speed ?? 20,
                  },
        dir: options.dir,
        scale:
            options.scale !== undefined &&
            Number.isFinite(options.scale) &&
            options.scale > 0
                ? options.scale
                : undefined,
        onExternalDrag: options.onExternalDrag,
        createId: options.createId,
    };
}

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
    /** what the preview shown was asked for: what the gesture's command asks for */
    asked: GridRect;
    /**
     * the pixels pixel constraints read throughout (K2): the geometry and the height the root
     * showed when it started (a preview that grows the grid moves no bound)
     */
    readonly env: ConstraintEnv;
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
    /** the last pointer event applied: where an auto-scroll recomputes the preview from */
    last: MouseEvent | undefined;
    /** the edge auto-scroll's frame, while it scrolls (R6) */
    scrolling: number | undefined;
    /** what scrolls each way, found once the gesture first nears an edge (`null`: nothing) */
    scrollers: { x: Element | null; y: Element | null } | undefined;
    /** a resize: the smallest and largest boxes it can land at, found at its first frame */
    limits: { least: PixelRect; most: PixelRect } | undefined;
    /** a touch holds the item: the page must not scroll under it */
    touch: boolean;
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
    /** a touch on an item's body: it drags once held long enough, and scrolls if it moves first */
    readonly held: boolean;
    readonly cleanup: (() => void)[];
}

/** What a preview shows: the layout, where the held item lands, whether the model refuses it. */
interface Preview {
    readonly layout: Layout;
    readonly landed: LayoutItem;
    readonly refused: boolean;
    /** what it was asked for */
    readonly asked: GridRect;
}

/**
 * How far past a threshold the width must go to cross back the one it just crossed: a scrollbar
 * that a breakpoint's taller layout brings (or takes away) never flips it back (no resize loop).
 */
const SETTLE = 24;

/** Rows past any a pointer reaches: a resize's largest ask, bounded only by its constraints. */
const UNBOUNDED_ROWS = 100_000;

/** The gap and the row height a grid takes by default. */
const DEFAULT_GAP: readonly [number, number] = [10, 10];
const DEFAULT_ROW_HEIGHT = 150;

/** A pair (`[inline, block]`), not a map of them. */
const isPair = (value: unknown) => Array.isArray(value);

/** A number, not a map of them. */
const isNumber = (value: unknown) => typeof value === "number";

const ARROWS: Record<string, readonly [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

/** Whether two layouts put the same items in the same boxes, in the same order. */
function samePlaces(a: Layout, b: Layout): boolean {
    return (
        a === b ||
        (a.length === b.length &&
            a.every((item, index) => {
                const other = b[index];
                return (
                    other !== undefined &&
                    other.id === item.id &&
                    sameRect(item, other)
                );
            }))
    );
}

const rectOf = (item: GridRect): GridRect => ({
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
});

/** An overflow that scrolls (or will, once its content grows). */
const scrolls = (overflow: string | undefined) =>
    overflow === "auto" || overflow === "scroll" || overflow === "overlay";

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
    /** the root's on-screen size over its layout size, per axis: a CSS-scaled parent's (K5) */
    let scale = { x: settings.scale ?? 1, y: settings.scale ?? 1 };
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
        // an item a keyboard drop added, not mounted before the app's next command: not focused
        focusNext = undefined;
        // the layout (or the breakpoint) changed under a gesture (the app ran a command): it
        // ends, unapplied; a rule that changed nothing in the layout leaves it going
        if (
            session &&
            (event.before.layouts !== event.after.layouts ||
                event.before.breakpoint !== event.after.breakpoint)
        ) {
            cancel(undefined);
        } else {
            update();
        }
        // new thresholds: the width decides the breakpoint again
        if (event.before.breakpoints !== event.after.breakpoints) reresolve();
    });

    // ─── the view ───────────────────────────────────────────────────────────────────────────

    function geometryOf(): GridGeometry | undefined {
        const width = settings.width ?? measured;
        if (width <= 0) return undefined;
        // each value the active breakpoint's, when it is given per breakpoint (R4)
        const { breakpoint } = model.state;
        const gap = valueAt(settings.gap, breakpoint, isPair, DEFAULT_GAP);
        return {
            width,
            cols: model.state.cols,
            rowHeight: valueAt(
                settings.rowHeight,
                breakpoint,
                isNumber,
                DEFAULT_ROW_HEIGHT,
            ),
            gap,
            padding: valueAt(settings.padding, breakpoint, isPair, gap),
        };
    }

    // ─── the breakpoint ─────────────────────────────────────────────────────────────────────

    /** a breakpoint change that waited for the gesture to end */
    let breakpointWaits = false;
    /** the breakpoint the width gave last, and the threshold the measured width crossed to it */
    let resolved: string | undefined;
    let crossed: { from: string; threshold: number } | undefined;

    /** The breakpoint the width gives, when it gives a new one (R1). */
    function fromWidth(): string | undefined {
        const width = settings.width ?? measured;
        if (width <= 0) return undefined;
        const next = model.get("breakpoint-for", { width });
        // the width's breakpoint did not change: one the app chose meanwhile stands
        if (next === resolved) return undefined;
        // a measured width crossing straight back the threshold it just crossed, by less than
        // SETTLE, is a scrollbar the switch brought or took: it stays (a given width never waits)
        if (crossed && Math.abs(width - crossed.threshold) >= SETTLE)
            crossed = undefined;
        if (crossed && next === crossed.from && settings.width === undefined) {
            return undefined;
        }
        if (resolved !== undefined && settings.width === undefined) {
            const { breakpoints } = model.state;
            crossed = {
                from: resolved,
                threshold: Math.max(
                    breakpoints[resolved] ?? 0,
                    breakpoints[next] ?? 0,
                ),
            };
        }
        resolved = next;
        return next;
    }

    /** Forgets what the width gave, so the width decides again (its breakpoints changed). */
    function reresolve(): void {
        resolved = undefined;
        crossed = undefined;
        resolveBreakpoint();
    }

    /** Makes the controlled breakpoint, else a new one the width gives, the model's active one. */
    function resolveBreakpoint(): void {
        // never under a gesture (a scrollbar its preview brings): once it ends
        if (session) {
            breakpointWaits = true;
            return;
        }
        const wanted = settings.breakpoint ?? fromWidth();
        if (
            wanted === undefined ||
            wanted === model.state.breakpoint ||
            !Object.hasOwn(model.state.breakpoints, wanted)
        ) {
            return;
        }
        model.run("breakpoint.set", { breakpoint: wanted });
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
            breakpoint: model.state.breakpoint,
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
            a.breakpoint === b.breakpoint &&
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
    // a given width or a controlled breakpoint applies from the start (server rendering)
    resolveBreakpoint();

    // ─── pixels and direction ───────────────────────────────────────────────────────────────

    /**
     * The scale the root is drawn at: the `scale` option, else its box on screen over its layout
     * size (`transform: scale()` on an ancestor), read at a gesture's start and on measure.
     */
    function readScale(): void {
        if (settings.scale !== undefined || !root) {
            const fixed = settings.scale ?? 1;
            scale = { x: fixed, y: fixed };
            return;
        }
        const box = root.getBoundingClientRect();
        const of = (shown: number, laid: number) =>
            shown > 0 && laid > 0 ? shown / laid : 1;
        scale = {
            x: of(box.width, root.offsetWidth),
            y: of(box.height, root.offsetHeight),
        };
    }

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
        // items are placed from the padding box (inside the border), in the root's own pixels
        const left = (clientX - box.left) / scale.x - root.clientLeft;
        const top =
            (clientY - box.top) / scale.y - root.clientTop + root.scrollTop;
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
        return (
            x < 0 ||
            x > box.width / scale.x ||
            y < 0 ||
            y > box.height / scale.y + below
        );
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
            refused: current.refused,
            target: ended?.target ?? null,
            origin: current.origin,
        };
        for (const listener of [...gestureListeners]) listener(event);
    }

    // ─── previews ───────────────────────────────────────────────────────────────────────────

    /**
     * The height the root shows: the layout's with `autoSize`, its own otherwise. A gesture keeps
     * the one it started with, in its `env`, for each dry run and its command; the model never
     * stores it (K2).
     */
    const shownHeight = () =>
        settings.autoSize ? view.height : (root?.clientHeight ?? 0);

    /** The command a gesture ending at `target` runs, or none when it changes nothing. */
    function commandFor(current: Session, target: GridRect) {
        const { before, itemId } = current;
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
        asked: rectOf(current.before),
    });

    /**
     * The layout if `current` ended at `target`, by the model's own dry run (its middleware
     * included): the preview is exactly what the drop commits. A landing the model refuses
     * previews the start, the item going back where it was (a drop: nowhere).
     */
    function previewFor(current: Session, target: GridRect): Preview {
        const call = commandFor(current, target);
        if (!call) return still(current);
        const result = model.check(call.command, call.payload as never, {
            env: current.env,
        });
        if (!result.ok) {
            // a refused drop is where it is, shown refused; a refused move goes back
            const landed =
                current.kind === "drop"
                    ? { ...current.before, ...target }
                    : current.before;
            return {
                layout: current.start,
                landed,
                refused: true,
                asked: target,
            };
        }
        const value = result.value as {
            readonly item: LayoutItem;
            readonly layout: Layout;
        };
        return {
            layout: value.layout,
            landed: value.item,
            refused: false,
            asked: target,
        };
    }

    /** Shows `next`: a new view only when what it shows changed. */
    function show(current: Session, next: Preview, outside: boolean): void {
        // the command asks for what this preview was asked for (the same places either way)
        current.asked = next.asked;
        // a dry run gives new objects: the same places show nothing new (no render)
        if (
            samePlaces(next.layout, current.preview) &&
            sameRect(next.landed, current.landed) &&
            next.refused === current.refused &&
            outside === current.outside
        ) {
            return;
        }
        const geometry = geometryOf();
        if (!geometry) return;
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
        readScale();
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
            asked: rectOf(before),
            env: { geometry, height: shownHeight() },
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
            last: undefined,
            scrolling: undefined,
            scrollers: undefined,
            limits: undefined,
            touch: false,
            cleanup: [],
        };
        session = current;
        update();
        return current;
    }

    /** Ends the session: the item drawn at rest again, and what it listened to removed. */
    function finish(current: Session): void {
        if (root) {
            const host = root.ownerDocument.defaultView;
            if (current.frame !== undefined)
                host?.cancelAnimationFrame(current.frame);
            if (current.scrolling !== undefined)
                host?.cancelAnimationFrame(current.scrolling);
        }
        for (const remove of current.cleanup) remove();
        session = undefined;
        pointerAt = undefined;
        update();
        if (breakpointWaits) {
            breakpointWaits = false;
            resolveBreakpoint();
        }
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
        const call = commandFor(current, current.asked);
        // the command first, then the session ends: the item goes straight to where it landed
        if (call && current.preview !== current.start) {
            committing = true;
            try {
                model.run(call.command, call.payload as never, {
                    env: current.env,
                });
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
            const call = commandFor(current, current.asked);
            committing = true;
            try {
                result = model.run(
                    "item.add",
                    call?.payload as { item: LayoutItem },
                    { env: current.env },
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

    /**
     * The cell an item of `w` × `h` drawn at `left`/`top` asks for, inside the columns: the
     * model's constraints decide where it lands (`maxRows` is `gridBounds`').
     */
    function cellFor(
        geometry: GridGeometry,
        left: number,
        top: number,
        size: { readonly w: number; readonly h: number },
    ): GridRect {
        const cell = cellAt(geometry, left, top);
        const { w, h } = size;
        return {
            x: Math.max(0, Math.min(cell.x, model.state.cols - w)),
            y: Math.max(0, cell.y),
            w,
            h,
        };
    }

    /**
     * The smallest and largest boxes a resize can land at, in pixels: what the model's own
     * constraints give the extreme sizes (its limits, `maxRows`, an item's own constraints), the
     * fixed edges kept. Asked once per gesture; the frames only clamp to them.
     */
    function drawLimits(
        current: Session,
        geometry: GridGeometry,
    ): { least: PixelRect; most: PixelRect } {
        const rules = rulesOf(model.state);
        const side = current.side ?? "bottom-end";
        const at = (w: number, h: number) =>
            itemPixels(
                geometry,
                constrainResize(
                    current.before,
                    side,
                    { w, h },
                    rules,
                    current.start,
                    current.env,
                ),
            );
        // as far as a pointer can pull: every column, and rows past any reach
        return { least: at(1, 1), most: at(rules.cols, UNBOUNDED_ROWS) };
    }

    /** Applies the last pointer position: the item drawn at it, and the preview retargeted. */
    function frame(current: Session): void {
        current.frame = undefined;
        const event = current.pending;
        const geometry = geometryOf();
        if (!event || !geometry || !root || session !== current) return;
        current.pending = undefined;
        current.last = event;
        const box = root.getBoundingClientRect();
        const point = pointIn(event.clientX, event.clientY, box);
        const start = current.startRect;
        let outside = false;
        let target: GridRect;
        if (current.kind === "drop") {
            // the new item centred under the pointer, moved by the source's offset (on screen)
            pointerAt = { x: event.clientX, y: event.clientY };
            for (const element of dragPreviews) placePreview(element);
            // the offset is on screen: in the root's pixels, it is divided by the scale
            const offset = current.drop?.dragOffset;
            const dx = ((offset?.x ?? 0) / scale.x) * (dir === "rtl" ? -1 : 1);
            const at = {
                ...start,
                left: point.x - start.width / 2 + dx,
                top: point.y - start.height / 2 + (offset?.y ?? 0) / scale.y,
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
            const edges = sideEdges(current.side ?? "bottom-end");
            const { inline, block } = edges;
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
            // drawn no smaller or larger than it can land (react-grid-layout#2235)
            current.limits ??= drawLimits(current, geometry);
            const { least, most } = current.limits;
            const drawnWidth = Math.max(
                least.width,
                Math.min(width, most.width),
            );
            const drawnHeight = Math.max(
                least.height,
                Math.min(height, most.height),
            );
            if (inline === "start") left += width - drawnWidth;
            if (block === "top") top += height - drawnHeight;
            width = drawnWidth;
            height = drawnHeight;
            if (current.element) {
                place(current.element, {
                    left,
                    top,
                    width: Math.max(width, 0),
                    height: Math.max(height, 0),
                });
            }
            // the size asked, inside the columns: the constraints (by default the item's limits
            // and the grid's bounds) are the model's
            target = resizeRect(
                { id: current.itemId, ...rectOf(current.before) },
                current.side ?? "bottom-end",
                unitsAt(geometry, width, height),
                { cols: model.state.cols },
            );
        }
        retarget(current, target, outside);
        if (current.kind === "drop") {
            if (!current.outside) emit("drop-over", current, event);
        } else {
            emit(current.kind === "move" ? "drag" : "resize", current, event);
        }
        autoScroll(current);
    }

    // ─── edge auto-scroll ───────────────────────────────────────────────────────────────────

    /**
     * The nearest ancestor of the root (or the root) that scrolls along each axis, else the
     * page's scroller (`null` without one). Found once a gesture, not every frame, in one walk:
     * one style read per ancestor for both axes.
     */
    function scrollersOf(start: HTMLElement): {
        x: Element | null;
        y: Element | null;
    } {
        const host = start.ownerDocument.defaultView;
        const page = start.ownerDocument.scrollingElement;
        let x: Element | undefined;
        let y: Element | undefined;
        for (
            let element: HTMLElement | null = start;
            element && element !== page && !(x && y);
            element = element.parentElement
        ) {
            const style = host?.getComputedStyle(element);
            // by its style, room or not yet: a grid growing under a gesture makes room
            if (!x && scrolls(style?.overflowX)) x = element;
            if (!y && scrolls(style?.overflowY)) y = element;
        }
        return { x: x ?? page, y: y ?? page };
    }

    /**
     * How far to scroll along one axis for a pointer at `at` between `start` and `end`: none
     * outside the edge zones (each at most half the view, so they never overlap), more the
     * deeper into one (the full speed past the edge), toward it.
     */
    function edgeStep(at: number, start: number, end: number): number {
        const zone = settings.autoScroll;
        if (!zone) return 0;
        const threshold = Math.min(zone.threshold, (end - start) / 2);
        if (threshold <= 0) return 0;
        const ramp = (depth: number) =>
            Math.ceil(
                zone.speed * Math.min(1, Math.max(0, 1 - depth / threshold)),
            );
        if (at < start + threshold) return -ramp(at - start);
        if (at > end - threshold) return ramp(end - at);
        return 0;
    }

    /** A scroller's visible box: the viewport for the page's, else its own box within it. */
    function visibleBox(scroller: Element, doc: Document) {
        const view = doc.documentElement;
        const page = {
            top: 0,
            left: 0,
            bottom: view.clientHeight,
            right: view.clientWidth,
        };
        if (scroller === doc.scrollingElement) return page;
        const box = scroller.getBoundingClientRect();
        return {
            top: Math.max(box.top, page.top),
            left: Math.max(box.left, page.left),
            bottom: Math.min(box.bottom, page.bottom),
            right: Math.min(box.right, page.right),
        };
    }

    /**
     * How far past the grid's end a gesture may scroll down: half a held item (room to put it
     * below the last row, its centre within the grid's reach), a row for a resize (the preview
     * grows a row at a time).
     */
    function reachBelow(current: Session): number {
        const geometry = geometryOf();
        const reach =
            current.kind !== "resize"
                ? current.startRect.height / 2
                : geometry
                  ? geometry.rowHeight + geometry.gap[1]
                  : 0;
        // in the root's pixels: on screen, times its scale
        return reach * scale.y;
    }

    /**
     * One axis's scroll for the pointer now, or 0 outside the edge zones (R6), and 0 once the
     * grid's own box is all in view that way: the held item, drawn past it, never makes more room
     * to scroll into. Down, with `autoSize`, a little more ({@link reachBelow}): the grid grows to
     * take what the gesture brings below its last row.
     */
    function axisStep(current: Session, axis: "x" | "y"): number {
        const at = current.pending ?? current.last;
        const scroller = current.scrollers?.[axis];
        if (!root || !at || !scroller) return 0;
        const box = visibleBox(scroller, root.ownerDocument);
        const step =
            axis === "y"
                ? edgeStep(at.clientY, box.top, box.bottom)
                : edgeStep(at.clientX, box.left, box.right);
        // out of the zones (most frames): nothing more to read
        if (step === 0) return 0;
        const grid = root.getBoundingClientRect();
        const hidden =
            axis === "y"
                ? step < 0
                    ? grid.top < box.top
                    : grid.bottom +
                          (settings.autoSize ? reachBelow(current) : 0) >
                      box.bottom
                : step < 0
                  ? grid.left < box.left
                  : grid.right > box.right;
        return hidden ? step : 0;
    }

    /** Scrolls `scroller` by `delta` along `axis` at once; says whether it moved. */
    function scrollAlong(
        scroller: Element,
        axis: "x" | "y",
        delta: number,
    ): boolean {
        if (delta === 0) return false;
        const before = axis === "y" ? scroller.scrollTop : scroller.scrollLeft;
        // at once, whatever the page's `scroll-behavior`: the position is read back right after
        if (typeof scroller.scrollBy === "function") {
            scroller.scrollBy({
                [axis === "y" ? "top" : "left"]: delta,
                behavior: "instant",
            });
        } else if (axis === "y") scroller.scrollTop = before + delta;
        else scroller.scrollLeft = before + delta;
        return (
            (axis === "y" ? scroller.scrollTop : scroller.scrollLeft) !== before
        );
    }

    /**
     * Near the scroll container's edge, scrolls it a frame at a time, the preview following the
     * pointer (R6); stops once out of the zone, at the end, or with the gesture. A native drag is
     * the browser's to scroll.
     */
    function autoScroll(current: Session): void {
        const host = root?.ownerDocument.defaultView;
        if (
            !root ||
            !host ||
            !settings.autoScroll ||
            current.source === "native" ||
            current.scrolling !== undefined
        ) {
            return;
        }
        current.scrollers ??= scrollersOf(root);
        if (axisStep(current, "x") === 0 && axisStep(current, "y") === 0)
            return;
        current.scrolling = host.requestAnimationFrame(() => {
            current.scrolling = undefined;
            const scrollers = current.scrollers;
            if (session !== current || !scrollers) return;
            // where the pointer is now: it may have left the zone since
            const movedX =
                scrollers.x !== null &&
                scrollAlong(scrollers.x, "x", axisStep(current, "x"));
            const movedY =
                scrollers.y !== null &&
                scrollAlong(scrollers.y, "y", axisStep(current, "y"));
            // at the end: nothing moved, and nothing more to do until the pointer moves
            if (!movedX && !movedY) return;
            // the preview follows: from a newer pointer position when one waits for its frame
            current.pending ??= current.last;
            frame(current);
        });
    }

    /** What a touch holding an item stops: a long press's menu and text selection. */
    function holdTouch(doc: Document): () => void {
        return listen(doc, "contextmenu", (menu) => menu.preventDefault());
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
        // a touch drag is not a page scroll (the root's touchmove guard) and opens no menu
        if (event.pointerType === "touch") {
            current.touch = true;
            current.cleanup.push(holdTouch(doc));
        }
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
        heldItem?: string,
    ): void {
        if (!root) return;
        endPress();
        const doc = root.ownerDocument;
        const host = doc.defaultView;
        const down: Press = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            element,
            drag: (move) => drag(down, move),
            held: heldItem !== undefined,
            cleanup: [],
        };
        press = down;
        if (heldItem !== undefined && host) {
            // a touch on an item's body: held long enough, it drags from where it is (R5). The
            // hold is shown on the item's own element: a touch that turns out a scroll renders
            // nothing
            const held = items.get(heldItem);
            held?.setAttribute(PRESSING_ATTRIBUTE, "");
            const timer = host.setTimeout(() => {
                if (press !== down) return;
                endPress();
                down.drag(event);
            }, settings.touchDelay);
            down.cleanup.push(
                () => host.clearTimeout(timer),
                holdTouch(doc),
                listen(doc, "selectstart", (select) => select.preventDefault()),
                () => held?.removeAttribute(PRESSING_ATTRIBUTE),
            );
        }
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
                if (down.held) {
                    // a touch that moves before it is held long enough scrolls the page: the
                    // grid lets it go
                    if (distance > settings.touchTolerance) endPress();
                    return;
                }
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
              /** the item's body, not a handle: a touch there is held before it drags */
              body?: boolean;
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
                    : { kind: "move", itemId, element: html, body: true };
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
        pressOn(
            event,
            pressed.element,
            (down, move) => {
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
            },
            event.pointerType === "touch" && pressed.body
                ? pressed.itemId
                : undefined,
        );
    }

    // ─── drops from outside ─────────────────────────────────────────────────────────────────

    /**
     * The item `drop` adds at `cell`, its size within its limits and the columns. Its id is the
     * one the drop commits, made when the drop begins: the preview and the drop are the same
     * `item.add`, for any middleware that reads the id.
     */
    function dropped(
        drop: ExternalDrop,
        cell: { readonly x: number; readonly y: number },
    ): LayoutItem {
        const item = dropItemOf(drop.item);
        // inside the columns: its limits are the model's constraints, on the drop
        return {
            ...item,
            id: drop.itemId ?? newId(),
            x: cell.x,
            y: cell.y,
            w: Math.min(item.w, model.state.cols),
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
        const drop = {
            item: dropItemOf(answer),
            data: answer.data,
            dragOffset: answer.dragOffset,
        };
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
        // during another gesture (an item grabbed from the keyboard) a native drag is refused:
        // let pass, the browser would open a dropped file in place of the page
        const answer = session ? false : settings.onExternalDrag?.(event);
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
        if (!native || !own(event) || !root) return;
        // where it goes, when the browser says: still inside, or out (whatever the count, which
        // an element removed mid-drag leaves high: its own leave never comes)
        const to = event.relatedTarget as Node | null;
        native.depth = to
            ? root.contains(to)
                ? Math.max(native.depth - 1, 1)
                : 0
            : native.depth - 1;
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

    /**
     * Where one arrow takes the held item: one cell (or one size step) further, inside the
     * columns, and further again while the item's constraints bring that back to where it is (a
     * `snapToGrid` step), so a key always moves it when its rules allow.
     */
    function keyStep(
        current: Session,
        dx: number,
        dy: number,
        size: boolean,
    ): GridRect {
        const rules = rulesOf(model.state);
        const { target } = current;
        const layout = current.preview;
        const env = current.env;
        const held = { ...current.before, ...target };
        // as far as an ask can go: the columns, and the rows the layout reaches with room to spare
        const steps = Math.max(rules.cols, bottom(layout) + target.h) + 1;
        const ask = (n: number): GridRect =>
            size
                ? {
                      ...target,
                      w: Math.max(
                          1,
                          Math.min(target.w + dx * n, rules.cols - target.x),
                      ),
                      h: Math.max(1, target.h + dy * n),
                  }
                : {
                      ...target,
                      x: Math.max(
                          0,
                          Math.min(target.x + dx * n, rules.cols - target.w),
                      ),
                      y: Math.max(0, target.y + dy * n),
                  };
        const where = (rect: GridRect): GridRect =>
            size
                ? constrainResize(held, "bottom-end", rect, rules, layout, env)
                : {
                      ...rect,
                      ...constrainMove(
                          held,
                          rect.x,
                          rect.y,
                          rules,
                          layout,
                          env,
                      ),
                  };
        const here = where(target);
        for (let n = 1; n <= steps; n++) {
            const next = ask(n);
            // at the edge: no further to go
            if (sameRect(next, ask(n - 1))) return next;
            if (!sameRect(where(next), here)) return next;
        }
        return ask(1);
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
        // arrows are visual: in right-to-left, ArrowRight goes toward the inline start
        const dx = dir === "rtl" ? -arrow[0] : arrow[0];
        const dy = arrow[1];
        if (!may(current, event.shiftKey ? "size" : "move")) return;
        const next = keyStep(current, dx, dy, event.shiftKey);
        // a step the model would refuse (a middleware, a collision) is not taken, unless the item
        // is refused where it is already (a drop that entered where the rules say no): it steps out
        const outcome = previewFor(current, next);
        if (outcome.refused && !current.refused) return;
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

    // what `get`, `run` and `is` answer, made once (not on every call)
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
            // a zoom on an ancestor resizes nothing: the scale is read again (K5)
            if (!session) readScale();
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
        cells: ({ rows }) =>
            view.geometry
                ? gridCells(view.geometry, cellRowCount(view, rows))
                : [],
    };
    const actions: {
        [K in keyof EngineActionMap]: (
            payload: EngineActionMap[K]["payload"],
        ) => EngineActionMap[K]["result"];
    } = {
        "cancel-gesture": () => cancel(undefined),
        "focus-item": ({ itemId }) => focusItem(itemId),
    };
    const questions: {
        [K in keyof EngineQuestionMap]: (
            payload: EngineQuestionMap[K],
        ) => boolean;
    } = {
        "item-active-by": ({ itemId }) => session?.itemId === itemId,
    };

    const engine: GridLayoutEngine = {
        get(key, ...[payload]) {
            const query = queries[key] as (
                payload: unknown,
            ) => EngineQueryMap[typeof key]["result"];
            return query(payload);
        },
        run(action, ...[payload]) {
            const run = actions[action] as (
                payload: unknown,
            ) => EngineActionMap[typeof action]["result"];
            return run(payload);
        },
        is(key, payload) {
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
                // there from a touch's start, as a phone requires to let it be cancelled: a touch
                // that holds an item never scrolls the page (R5); any other touch scrolls it
                const unguard = listen(
                    element,
                    "touchmove",
                    (touch) => {
                        if (session?.touch) touch.preventDefault();
                    },
                    { passive: false },
                );
                measured = Math.round(element.clientWidth);
                readDirection();
                readScale();
                resolveBreakpoint();
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
                              readScale();
                              resolveBreakpoint();
                              update();
                          });
                      })
                    : undefined;
                observer?.observe(element);
                return () => {
                    unguard();
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
                if (settings.scale !== before.scale) readScale();
                // released, the width decides again; a new one (or a new width) applies
                if (
                    before.breakpoint !== undefined &&
                    settings.breakpoint === undefined
                ) {
                    reresolve();
                } else if (
                    settings.breakpoint !== before.breakpoint ||
                    settings.width !== before.width
                ) {
                    resolveBreakpoint();
                }
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
