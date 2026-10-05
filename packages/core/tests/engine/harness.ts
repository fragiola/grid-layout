// The engine against a DOM jsdom cannot lay out: the root's width, ResizeObserver, animation
// frames and pointer capture are faked, and the items are the elements an adapter would render.
// Frames run when a test says so (`flush`), so a test sees exactly what one frame does.

import { afterEach, vi } from "vitest";
import {
    createGridLayoutEngine,
    createGridLayoutModel,
    type ExternalDrop,
    type GestureEvent,
    type GridLayoutEngineOptions,
    type GridLayoutModelOptions,
    type GridLayoutView,
    type ResizeSide,
} from "../../src";

let frames: FrameRequestCallback[] = [];
/** a frame cancelled: it runs nothing and is not pending */
const CANCELLED: FrameRequestCallback = () => {};
let resize: (() => void) | undefined;
/** what each grid set up in a test leaves behind: its engine stops listening to the document */
const teardowns: (() => void)[] = [];

afterEach(() => {
    for (const teardown of teardowns.splice(0)) teardown();
    document.body.innerHTML = "";
    frames = [];
    resize = undefined;
    vi.unstubAllGlobals();
});

function stubBrowser(): void {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        const index = id - 1;
        if (frames[index]) frames[index] = CANCELLED;
    });
    vi.stubGlobal(
        "ResizeObserver",
        class {
            readonly #callback: () => void;
            constructor(callback: () => void) {
                this.#callback = callback;
                resize = () => this.#callback();
            }
            observe() {}
            disconnect() {
                resize = undefined;
            }
        },
    );
    const captured = new WeakMap<Element, Set<number>>();
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.setPointerCapture = function (this: Element, id: number) {
        const set = captured.get(this) ?? new Set<number>();
        set.add(id);
        captured.set(this, set);
    };
    proto.hasPointerCapture = function (this: Element, id: number) {
        return captured.get(this)?.has(id) ?? false;
    };
    proto.releasePointerCapture = function (this: Element, id: number) {
        captured.get(this)?.delete(id);
    };
}

/** How many animation frames are requested and not yet run. */
export function pendingFrames(): number {
    return frames.filter((frame) => frame !== CANCELLED).length;
}

/** Runs the animation frames requested so far. */
export function flush(): void {
    const pending = frames;
    frames = [];
    for (const callback of pending) callback(0);
}

export interface HarnessOptions extends GridLayoutModelOptions {
    engine?: GridLayoutEngineOptions;
    /** the root's measured width (default 1200) */
    width?: number;
    dir?: "ltr" | "rtl";
}

/**
 * A grid layout on a fake root: 12 columns of about 99px with a 10px gap and padding, rows of
 * 50px (a cell is 60px from the next), unless the options say otherwise.
 */
export function setup(options: HarnessOptions = {}) {
    stubBrowser();
    const {
        engine: engineOptions,
        width = 1200,
        dir,
        ...modelOptions
    } = options;
    const model = createGridLayoutModel(modelOptions);
    const engine = createGridLayoutEngine(model, {
        rowHeight: 50,
        gap: [10, 10],
        ...engineOptions,
    });
    const root = document.createElement("div");
    root.setAttribute("data-grid-layout-part", "root");
    if (dir) root.style.direction = dir;
    const size = { width };
    Object.defineProperty(root, "clientWidth", { get: () => size.width });
    // the root's box on screen: at the viewport's corner, as tall as the layout it shows
    root.getBoundingClientRect = () =>
        new DOMRect(0, 0, size.width, engine.adapter.getView().height);
    document.body.append(root);
    root.addEventListener("pointerdown", (event) =>
        engine.adapter.pointerdown(event),
    );
    root.addEventListener("keydown", (event) => engine.adapter.keydown(event));
    for (const type of [
        "dragenter",
        "dragover",
        "dragleave",
        "drop",
    ] as const) {
        root.addEventListener(type, (event) =>
            engine.adapter[type](event as DragEvent),
        );
    }
    let views = 0;
    engine.adapter.subscribe(() => {
        views++;
    });
    const events: GestureEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const detach = engine.adapter.attach(root);
    teardowns.push(() => {
        detach();
        engine.destroy();
    });

    const elements = new Map<string, HTMLElement>();
    for (const item of model.get("layout")) {
        const element = document.createElement("div");
        element.setAttribute("data-grid-layout-part", "item");
        element.tabIndex = 0;
        root.append(element);
        engine.adapter.registerItem(item.id, element);
        elements.set(item.id, element);
    }

    function item(id: string): HTMLElement {
        const element = elements.get(id);
        if (!element) throw new Error(`no item "${id}"`);
        return element;
    }

    return {
        model,
        engine,
        root,
        events,
        detach,
        item,
        /** how many views the adapter has been told of so far */
        views: () => views,
        view: (): GridLayoutView => engine.adapter.getView(),
        /** a child of an item: a drag handle when registered, any element otherwise */
        child(id: string, tag = "div"): HTMLElement {
            const element = document.createElement(tag);
            item(id).append(element);
            return element;
        },
        dragHandle(id: string): HTMLElement {
            const element = document.createElement("span");
            item(id).append(element);
            engine.adapter.registerDragHandle(id, element);
            return element;
        },
        resizeHandle(id: string, side: ResizeSide): HTMLElement {
            const element = document.createElement("span");
            item(id).append(element);
            engine.adapter.registerResizeHandle(id, side, element);
            return element;
        },
        /** a drag source outside the root, wired as an adapter wires one */
        source(drop: ExternalDrop): HTMLElement {
            const element = document.createElement("div");
            element.tabIndex = 0;
            document.body.append(element);
            element.addEventListener("pointerdown", (event) =>
                engine.adapter.startExternalDrag(event, element, drop),
            );
            element.addEventListener("keydown", (event) =>
                engine.adapter.startExternalGrab(event, element, drop),
            );
            return element;
        },
        /** registers the element of an item the layout gained (a drop), as an adapter would */
        mount(id: string): HTMLElement {
            const element = document.createElement("div");
            element.setAttribute("data-grid-layout-part", "item");
            element.tabIndex = 0;
            root.append(element);
            engine.adapter.registerItem(id, element);
            elements.set(id, element);
            return element;
        },
        /** changes the root's width and tells the observer, as a resize does */
        resizeTo(next: number): void {
            size.width = next;
            resize?.();
            flush();
        },
    };
}

let nextPointer = 1;

/** A pointer: pressed on `target` at a viewport point, moved, released (one frame each). */
export function pointer(
    target: Element,
    x: number,
    y: number,
    init: PointerEventInit = {},
) {
    const pointerId = nextPointer++;
    const fire = (
        type: string,
        at: { x: number; y: number },
        buttons: number,
        on: EventTarget,
    ) => {
        const event = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId,
            clientX: at.x,
            clientY: at.y,
            button: 0,
            buttons,
            ...init,
        });
        on.dispatchEvent(event);
        return event;
    };
    fire("pointerdown", { x, y }, 1, target);
    return {
        pointerId,
        /** moves to a point, then runs the frame */
        move(toX: number, toY: number, buttons = 1) {
            fire(
                "pointermove",
                { x: toX, y: toY },
                buttons,
                target.ownerDocument,
            );
            flush();
        },
        /** moves without running the frame */
        moveOnly(toX: number, toY: number) {
            fire("pointermove", { x: toX, y: toY }, 1, target.ownerDocument);
        },
        release(toX: number, toY: number) {
            fire("pointerup", { x: toX, y: toY }, 0, target.ownerDocument);
        },
        cancel() {
            fire("pointercancel", { x, y }, 0, target.ownerDocument);
        },
    };
}

/** A key pressed on `target`. */
export function key(
    target: Element,
    name: string,
    init: KeyboardEventInit = {},
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key: name,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

/**
 * A native drag event (jsdom has no `DragEvent`): a mouse event with a `DataTransfer` stand-in
 * that records the drop effect.
 */
export function nativeDrag(
    target: Element,
    type: "dragenter" | "dragover" | "dragleave" | "drop",
    x: number,
    y: number,
    files: readonly string[] = [],
): MouseEvent & { dataTransfer: { dropEffect: string } } {
    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
    });
    const dataTransfer = {
        dropEffect: "none",
        effectAllowed: "all",
        types: files.length > 0 ? ["Files"] : [],
        files: files.map((name) => ({ name })),
    };
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    target.dispatchEvent(event);
    return event as MouseEvent & { dataTransfer: { dropEffect: string } };
}
