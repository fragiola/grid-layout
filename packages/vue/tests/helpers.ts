// Shared setup for the component tests: what jsdom lacks for gestures (animation frames, pointer
// capture), frames run when a test says so, and a pointer to drive. Vue patches the DOM on the
// next tick, so every step that changes the grid is awaited.

import { mount } from "@vue/test-utils";
import { afterEach, vi } from "vitest";
import { type Component, nextTick } from "vue";

let frames: FrameRequestCallback[] = [];
const boxOf = HTMLElement.prototype.getBoundingClientRect;
const mounted: { unmount(): void }[] = [];

afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
    document.body.innerHTML = "";
    frames = [];
    vi.unstubAllGlobals();
    HTMLElement.prototype.getBoundingClientRect = boxOf;
});

/** Mounts a component into the document (focus and events need it), unmounted after the test. */
export function mountInDocument(component: Component, props?: object) {
    const host = document.createElement("div");
    document.body.append(host);
    const wrapper = mount(component, {
        props: props as Record<string, unknown>,
        attachTo: host,
    });
    mounted.push(wrapper);
    return wrapper;
}

/** Fakes animation frames, pointer capture and the root's box; call it before mounting a grid. */
export function stubBrowser(): void {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.setPointerCapture = () => {};
    proto.hasPointerCapture = () => false;
    proto.releasePointerCapture = () => {};
    // a root on screen: at the viewport's corner, as wide as the tests' grid, as tall as its style
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        return this.getAttribute("data-grid-layout-part") === "root"
            ? new DOMRect(
                  0,
                  0,
                  GEOMETRY.width,
                  Number.parseFloat(this.style.height) || 0,
              )
            : boxOf.call(this);
    };
}

/** Runs the animation frames requested so far, then lets Vue patch. */
export async function flush(): Promise<void> {
    const pending = frames;
    frames = [];
    for (const callback of pending) callback(0);
    await nextTick();
}

let nextPointer = 1;

/** A pointer pressed on `target` at a viewport point; `move` runs the frame. */
export async function pointer(target: Element, x: number, y: number) {
    const pointerId = nextPointer++;
    const fire = async (
        type: string,
        at: [number, number],
        buttons: number,
        on: EventTarget,
    ) => {
        on.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerId,
                clientX: at[0],
                clientY: at[1],
                button: 0,
                buttons,
            }),
        );
        await nextTick();
    };
    await fire("pointerdown", [x, y], 1, target);
    return {
        async move(toX: number, toY: number) {
            await fire("pointermove", [toX, toY], 1, target.ownerDocument);
            await flush();
        },
        async release(toX: number, toY: number) {
            await fire("pointerup", [toX, toY], 0, target.ownerDocument);
        },
    };
}

/** Fires a key on an element and lets Vue patch. */
export async function key(
    target: Element,
    name: string,
    init?: KeyboardEventInit,
) {
    target.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: name,
            bubbles: true,
            cancelable: true,
            ...init,
        }),
    );
    await nextTick();
}

/** A grid of 12 columns on 1200px with the tests' geometry: a column every 99.17px, a row 60px. */
export const GEOMETRY = { width: 1200, rowHeight: 50, gap: [10, 10] as const };

/** The viewport point inside cell (x, y), 5px from its corner. */
export function cell(x: number, y: number): [number, number] {
    return [10 + (1190 / 12) * x + 5, 10 + 60 * y + 5];
}

/** The element named `name` (its `aria-label`). */
export function box(name: string): HTMLElement {
    const found = document.querySelector<HTMLElement>(`[aria-label="${name}"]`);
    if (!found) throw new Error(`no element named ${name}`);
    return found;
}

/** The element named `name`, or `null`. */
export function maybeBox(name: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[aria-label="${name}"]`);
}
