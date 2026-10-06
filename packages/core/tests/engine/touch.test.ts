// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { itemPart } from "../../src/engine/parts";
import { noCompactor } from "../../src/layout/compact";
import type { LayoutItem } from "../../src/layout/types";
import { flush, pendingFrames, pointer, setup } from "./harness";

// Touch activation (R5): a touch on an item's body is held before it drags, so the page still
// scrolls; handles start at once; a mouse never waits. And edge auto-scroll (R6).

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
): LayoutItem => ({ id, x, y, w, h });

const two = () => ({ layout: [item("a", 0, 0, 2, 2), item("b", 2, 0, 2, 2)] });
const touch = { pointerType: "touch" } as const;

afterEach(() => {
    vi.useRealTimers();
});

describe("a touch on an item's body", () => {
    it("is held, then drags from where it is", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const grid = setup(two());
        const press = pointer(grid.item("a"), 20, 20, touch);
        // shown on the item's own element: no new view while a touch might be a scroll
        expect(grid.item("a").hasAttribute("data-pressing")).toBe(true);
        expect(itemPart(grid.view(), "a").attributes).not.toHaveProperty(
            "data-pressing",
        );
        expect(grid.view().gesture).toBeUndefined();
        // moving under the tolerance meanwhile keeps it held
        press.moveOnly(23, 22);
        vi.advanceTimersByTime(250);
        flush();
        expect(grid.item("a").hasAttribute("data-pressing")).toBe(false);
        expect(grid.view().gesture?.kind).toBe("move");
        expect(grid.events[0]?.type).toBe("drag-start");
        press.move(20 + (1190 / 12) * 4, 20);
        press.release(20 + (1190 / 12) * 4, 20);
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 4,
        });
    });

    it("lets the page scroll when it moves before it is held long enough (react-grid-layout#1793)", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const grid = setup(two());
        const press = pointer(grid.item("a"), 20, 20, touch);
        press.moveOnly(20, 40);
        expect(grid.item("a").hasAttribute("data-pressing")).toBe(false);
        vi.advanceTimersByTime(500);
        flush();
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.events).toHaveLength(0);
    });

    it("ends with the touch: a short tap is no drag", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const grid = setup(two());
        const press = pointer(grid.item("a"), 20, 20, touch);
        press.release(20, 20);
        vi.advanceTimersByTime(500);
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.item("a").hasAttribute("data-pressing")).toBe(false);
    });

    it("keeps the page from scrolling once it drags, never before", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const grid = setup(two());
        pointer(grid.item("a"), 20, 20, touch);
        const scroll = () => {
            const event = new Event("touchmove", {
                cancelable: true,
                bubbles: true,
            });
            grid.item("a").dispatchEvent(event);
            return event.defaultPrevented;
        };
        expect(scroll()).toBe(false);
        vi.advanceTimersByTime(250);
        expect(scroll()).toBe(true);
    });

    it("takes a custom delay and tolerance", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const grid = setup({
            ...two(),
            engine: { touchDelay: 600, touchTolerance: 20 },
        });
        const press = pointer(grid.item("a"), 20, 20, touch);
        press.moveOnly(35, 20);
        vi.advanceTimersByTime(300);
        expect(grid.view().gesture).toBeUndefined();
        vi.advanceTimersByTime(300);
        expect(grid.view().gesture?.kind).toBe("move");
    });
});

describe("what never waits", () => {
    it("a touch on a drag handle or a resize handle, and a mouse on a body", () => {
        const grid = setup(two());
        const handle = grid.dragHandle("a");
        const press = pointer(handle, 20, 20, touch);
        expect(grid.item("a").hasAttribute("data-pressing")).toBe(false);
        press.move(60, 20);
        expect(grid.view().gesture?.kind).toBe("move");
        press.release(60, 20);
        const corner = grid.resizeHandle("b", "bottom-end");
        const pull = pointer(corner, 300, 100, touch);
        pull.move(400, 100);
        expect(grid.view().gesture?.kind).toBe("resize");
        pull.release(400, 100);
        const mouse = pointer(grid.item("b"), 300, 20);
        mouse.move(400, 20);
        expect(grid.view().gesture?.kind).toBe("move");
        mouse.release(400, 20);
    });
});

describe("edge auto-scroll", () => {
    /** A grid in a 300px tall scroll container, its content 2000px tall. */
    function scrolled(engine = {}) {
        const grid = setup({
            layout: [item("a", 0, 0, 2, 2), item("tall", 4, 0, 2, 30)],
            // nothing settles: an item dragged down stays down
            compactor: noCompactor,
            engine,
        });
        const scroller = document.createElement("div");
        scroller.style.overflowY = "auto";
        document.body.append(scroller);
        scroller.append(grid.root);
        let top = 0;
        Object.defineProperties(scroller, {
            scrollHeight: { get: () => 2000 },
            clientHeight: { get: () => 300 },
            scrollTop: {
                get: () => top,
                set: (value: number) => {
                    top = Math.max(0, Math.min(value, 1700));
                },
            },
            // no horizontal scroll: a browser keeps it at 0
            scrollLeft: { get: () => 0, set: () => {} },
        });
        scroller.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 300);
        // the viewport is larger than the scroller: its own edges count
        Object.defineProperties(document.documentElement, {
            clientHeight: { configurable: true, get: () => 800 },
            clientWidth: { configurable: true, get: () => 1300 },
        });
        grid.root.getBoundingClientRect = () =>
            new DOMRect(0, -top, 1200, 2000);
        return { grid, scroller };
    }

    it("scrolls near the bottom edge, faster the deeper, and the preview follows", () => {
        const { grid, scroller } = scrolled();
        const press = pointer(grid.item("a"), 20, 20);
        press.move(20, 290);
        const step = () => {
            const before = scroller.scrollTop;
            flush();
            return scroller.scrollTop - before;
        };
        // 10px into the 40px zone: three quarters of the speed
        expect(step()).toBe(15);
        const y = () =>
            grid.view().gesture?.preview.find((entry) => entry.id === "a")?.y ??
            0;
        const at = y();
        step();
        step();
        step();
        // the item is drawn lower in the content: the preview followed the scroll
        expect(y()).toBeGreaterThan(at);
        // 1px from the edge: the full speed
        press.move(20, 299);
        expect(step()).toBe(20);
        press.release(20, 299);
    });

    it("stops out of the zone, at the end, and with the gesture", () => {
        const { grid, scroller } = scrolled();
        const press = pointer(grid.item("a"), 20, 20);
        press.move(20, 299);
        flush();
        press.move(20, 150);
        flush();
        const still = scroller.scrollTop;
        flush();
        flush();
        expect(scroller.scrollTop).toBe(still);
        expect(pendingFrames()).toBe(0);
        // at the end: nothing more to do
        scroller.scrollTop = 1700;
        press.move(20, 299);
        flush();
        flush();
        expect(scroller.scrollTop).toBe(1700);
        expect(pendingFrames()).toBe(0);
        press.moveOnly(20, 299);
        press.release(20, 299);
        flush();
        expect(pendingFrames()).toBe(0);
    });

    it("scrolls up near the top edge, during a resize too", () => {
        const { grid, scroller } = scrolled();
        scroller.scrollTop = 500;
        const corner = grid.resizeHandle("a", "bottom-end");
        const pull = pointer(corner, 180, 100);
        pull.move(200, 5);
        flush();
        expect(scroller.scrollTop).toBeLessThan(500);
        pull.release(200, 5);
    });

    it("scrolls during a drop from a drag source", () => {
        const { grid, scroller } = scrolled();
        const source = grid.source({ item: { w: 2, h: 1 } });
        const press = pointer(source, 600, 150);
        press.move(600, 295);
        flush();
        expect(scroller.scrollTop).toBeGreaterThan(0);
        press.release(600, 295);
    });

    it("leaves no frame behind when the engine goes mid-scroll", () => {
        const { grid, scroller } = scrolled();
        const press = pointer(grid.item("a"), 20, 20);
        press.move(20, 299);
        expect(pendingFrames()).toBeGreaterThan(0);
        grid.detach();
        grid.engine.destroy();
        const at = scroller.scrollTop;
        flush();
        expect(scroller.scrollTop).toBe(at);
        expect(pendingFrames()).toBe(0);
    });

    it("leaves a mouse drag's context menu alone, and a native drag's scroll to the browser", () => {
        const { grid, scroller } = scrolled();
        const press = pointer(grid.item("a"), 20, 20);
        press.move(20, 150);
        const menu = new MouseEvent("contextmenu", {
            cancelable: true,
            bubbles: true,
        });
        document.dispatchEvent(menu);
        expect(menu.defaultPrevented).toBe(false);
        press.release(20, 150);
        const files = grid.engine;
        files.adapter.setOptions({
            rowHeight: 50,
            gap: [10, 10],
            onExternalDrag: () => ({ w: 1, h: 1 }),
        });
        const over = new MouseEvent("dragenter", {
            bubbles: true,
            cancelable: true,
            clientX: 600,
            clientY: 299,
        });
        grid.root.dispatchEvent(over);
        flush();
        flush();
        expect(scroller.scrollTop).toBe(0);
    });

    it("never scrolls when it is off", () => {
        const { grid, scroller } = scrolled({ autoScroll: false });
        const press = pointer(grid.item("a"), 20, 20);
        press.move(20, 299);
        flush();
        expect(scroller.scrollTop).toBe(0);
        press.release(20, 299);
    });
});
