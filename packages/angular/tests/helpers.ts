// Shared setup for the directive tests: what jsdom lacks for gestures (animation frames, pointer
// capture), frames run when a test says so, a pointer and keys to drive, and a component rendered
// in the document that settles (Angular renders on its own scheduler, zoneless).

import type { ComponentRef, Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, vi } from "vitest";

let frames: FrameRequestCallback[] = [];
const boxOf = HTMLElement.prototype.getBoundingClientRect;

afterEach(() => {
    frames = [];
    vi.unstubAllGlobals();
    HTMLElement.prototype.getBoundingClientRect = boxOf;
});

/** Lets the renders, the effects and the timers they schedule run. */
export async function settle(): Promise<void> {
    for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/** Renders `component` in the document (focus and events need it), with `inputs`, settled. */
export async function render<C>(
    component: Type<C>,
    inputs: Record<string, unknown> = {},
): Promise<ComponentFixture<C>> {
    const fixture = TestBed.createComponent(component);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    for (const [name, value] of Object.entries(inputs)) {
        fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    await settle();
    return fixture;
}

/** Sets an input of a rendered component and lets it settle. */
export async function setInput<C>(
    fixture: ComponentFixture<C>,
    name: string,
    value: unknown,
): Promise<void> {
    (fixture.componentRef as ComponentRef<C>).setInput(name, value);
    await fixture.whenStable();
    await settle();
}

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

/** Runs the animation frames requested so far, synchronously (Angular has not rendered yet). */
export function runFrames(): void {
    const pending = frames;
    frames = [];
    for (const callback of pending) callback(0);
}

/** Runs the animation frames requested so far, then lets Angular render. */
export async function flush(): Promise<void> {
    runFrames();
    await settle();
}

let nextPointer = 1;

/** Fires a pointer event of `pointerId` at a viewport point. */
function firePointer(
    on: EventTarget,
    type: string,
    pointerId: number,
    at: readonly [number, number],
    buttons: number,
): void {
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
}

/**
 * A pointer pressed on `target` at a viewport point; `move` runs the frame and lets Angular
 * render, `moveNow` only runs the frame (what the engine writes, before Angular renders).
 */
export async function pointer(target: Element, x: number, y: number) {
    const pointerId = nextPointer++;
    const doc = target.ownerDocument;
    firePointer(target, "pointerdown", pointerId, [x, y], 1);
    await settle();
    return {
        moveNow(toX: number, toY: number) {
            firePointer(doc, "pointermove", pointerId, [toX, toY], 1);
            runFrames();
        },
        async move(toX: number, toY: number) {
            firePointer(doc, "pointermove", pointerId, [toX, toY], 1);
            await flush();
        },
        async release(toX: number, toY: number) {
            firePointer(doc, "pointerup", pointerId, [toX, toY], 0);
            await settle();
        },
    };
}

/** Fires a key on an element and lets Angular render. */
export async function key(
    target: Element,
    name: string,
    init?: KeyboardEventInit,
): Promise<void> {
    target.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: name,
            bubbles: true,
            cancelable: true,
            ...init,
        }),
    );
    await settle();
}

/** A grid of 12 columns on 1200px with the tests' geometry: a column every 99.17px, a row 60px. */
export const GEOMETRY = {
    width: 1200,
    rowHeight: 50,
    gap: [10, 10] as const,
};

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
