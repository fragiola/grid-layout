// Shared setup for the component tests: what jsdom lacks for gestures (animation frames, pointer
// capture), frames run when a test says so, and a pointer to drive.

import { act } from "@testing-library/react";
import { afterEach, vi } from "vitest";

let frames: FrameRequestCallback[] = [];
const boxOf = HTMLElement.prototype.getBoundingClientRect;

afterEach(() => {
    frames = [];
    vi.unstubAllGlobals();
    HTMLElement.prototype.getBoundingClientRect = boxOf;
});

/** Fakes animation frames, pointer capture and the root's box; call it before rendering a grid. */
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

/** Runs the animation frames requested so far, inside `act`. */
export function flush(): void {
    act(() => {
        const pending = frames;
        frames = [];
        for (const callback of pending) callback(0);
    });
}

let nextPointer = 1;

/** A pointer pressed on `target` at a viewport point; `move` runs the frame, inside `act`. */
export function pointer(target: Element, x: number, y: number) {
    const pointerId = nextPointer++;
    const fire = (
        type: string,
        at: [number, number],
        buttons: number,
        on: EventTarget,
    ) =>
        act(() => {
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
        });
    fire("pointerdown", [x, y], 1, target);
    return {
        move(toX: number, toY: number) {
            fire("pointermove", [toX, toY], 1, target.ownerDocument);
            flush();
        },
        release(toX: number, toY: number) {
            fire("pointerup", [toX, toY], 0, target.ownerDocument);
        },
    };
}

/** A grid of 12 columns on 1200px with the tests' geometry: a column every 99.17px, a row 60px. */
export const GEOMETRY = { width: 1200, rowHeight: 50, gap: [10, 10] as const };

/** The viewport point inside cell (x, y), 5px from its corner. */
export function cell(x: number, y: number): [number, number] {
    return [10 + (1190 / 12) * x + 5, 10 + 60 * y + 5];
}
