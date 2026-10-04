// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { noCompactor } from "../../src/layout/compact";
import { itemPixels } from "../../src/layout/geometry";
import type { LayoutItem } from "../../src/layout/types";
import { veto } from "../../src/model/model";
import { flush, key, pointer, setup } from "./harness";

// The engine on a fake root 1200px wide: 12 columns of about 89px a 10px gap apart (a column every
// 99.17px, the first at 10px), rows of 50px every 60px from 10px.

const COLUMN = 1190 / 12;
const ROW = 60;
/** The viewport point inside cell (x, y), 5px from its corner. */
const at = (x: number, y: number) =>
    [10 + COLUMN * x + 5, 10 + ROW * y + 5] as const;

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra = {},
): LayoutItem => ({
    id,
    x,
    y,
    w,
    h,
    ...extra,
});

const two = () => ({ layout: [item("a", 0, 0, 2, 2), item("b", 2, 0, 2, 2)] });

describe("measuring and placing", () => {
    it("places every item from the root's width, and sizes the root to the layout", () => {
        const grid = setup(two());
        const view = grid.view();
        expect(view.width).toBe(1200);
        const geometry = view.geometry;
        if (!geometry) throw new Error("not measured");
        expect(view.rects.b).toEqual(
            itemPixels(geometry, item("b", 2, 0, 2, 2)),
        );
        // two rows of 50 with a gap of 10, and the padding above and below
        expect(view.height).toBe(50 * 2 + 10 + 10 * 2);
    });

    it("follows a resize of the root, once a frame", () => {
        const grid = setup(two());
        const before = grid.views();
        grid.resizeTo(600);
        expect(grid.view().width).toBe(600);
        expect(grid.views()).toBe(before + 1);
    });

    it("tells a new view only when what is rendered changes", () => {
        const grid = setup(two());
        const before = grid.views();
        grid.engine.adapter.setOptions({ rowHeight: 50, gap: [10, 10] });
        expect(grid.views()).toBe(before);
        grid.engine.adapter.setOptions({ rowHeight: 60, gap: [10, 10] });
        expect(grid.views()).toBe(before + 1);
    });

    it("has no geometry before the root is measured, unless a width is given", () => {
        const grid = setup({ ...two(), width: 0 });
        expect(grid.view().geometry).toBeUndefined();
        expect(grid.view().rects).toEqual({});
        const fixed = setup({ ...two(), width: 0, engine: { width: 800 } });
        expect(fixed.view().width).toBe(800);
    });
});

describe("dragging with a pointer", () => {
    it("stays a click under the threshold", () => {
        const grid = setup(two());
        const before = grid.views();
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(at(0, 0)[0] + 2, at(0, 0)[1]);
        press.release(at(0, 0)[0] + 2, at(0, 0)[1]);
        expect(grid.views()).toBe(before);
        expect(grid.events).toEqual([]);
    });

    it("moves the item at the pointer, previews the push, and commits once on release", () => {
        const grid = setup(two());
        const committed: string[] = [];
        grid.model.subscribe((event) => committed.push(event.command));
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(
            ...(at(0, 0).map((v, i) => v + (i === 0 ? 10 : 0)) as [
                number,
                number,
            ]),
        );
        expect(grid.view().gesture?.kind).toBe("move");
        // over column 2: b is pushed down in the preview, not yet in the model
        press.move(...at(2, 0));
        const preview = grid.view().gesture?.preview;
        expect(preview?.find((entry) => entry.id === "a")).toMatchObject({
            x: 2,
            y: 0,
        });
        expect(preview?.find((entry) => entry.id === "b")).toMatchObject({
            x: 2,
            y: 2,
        });
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
        });
        // the engine draws the held item at the pointer itself
        expect(grid.item("a").style.transform).toMatch(/^translate\(/);
        press.release(...at(2, 0));
        expect(committed).toEqual(["item.move"]);
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 2,
            y: 0,
        });
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.events.map((event) => event.type)).toEqual([
            "drag-start",
            "drag",
            "drag",
            "drag",
            "drag-stop",
        ]);
    });

    it("tells no new view while the pointer stays over the same cell", () => {
        const grid = setup(two());
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(at(0, 0)[0] + 20, at(0, 0)[1]);
        const views = grid.views();
        for (let dx = 21; dx < 40; dx += 3)
            press.move(at(0, 0)[0] + dx, at(0, 0)[1]);
        expect(grid.views()).toBe(views);
        press.move(...at(3, 0));
        expect(grid.views()).toBe(views + 1);
    });

    it("applies only the last pointer position of a frame", () => {
        const grid = setup(two());
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(at(0, 0)[0] + 20, at(0, 0)[1]);
        const drags = grid.events.length;
        press.moveOnly(...at(1, 0));
        press.moveOnly(...at(2, 0));
        press.moveOnly(...at(3, 1));
        flush();
        expect(grid.events.length).toBe(drags + 1);
        expect(
            grid.view().gesture?.preview.find((entry) => entry.id === "a"),
        ).toMatchObject({
            x: 3,
        });
    });

    it("cancels on Escape, pointercancel, a lost capture and a move with no button", () => {
        for (const end of ["escape", "cancel", "lost", "buttons"] as const) {
            const grid = setup(two());
            const start = grid.item("a").style.transform;
            const press = pointer(grid.item("a"), ...at(0, 0));
            press.move(...at(2, 1));
            if (end === "escape") key(document.body, "Escape");
            if (end === "cancel") press.cancel();
            if (end === "lost") {
                grid.item("a").dispatchEvent(
                    new PointerEvent("lostpointercapture", {
                        pointerId: press.pointerId,
                    }),
                );
            }
            if (end === "buttons") press.move(...at(3, 1), 0);
            press.release(...at(2, 1));
            expect(
                grid.model.get("item-by", { itemId: "a" }),
                end,
            ).toMatchObject({ x: 0, y: 0 });
            expect(grid.view().gesture, end).toBeUndefined();
            expect(grid.events.at(-1)?.type, end).toBe("cancel");
            // back where it was: the engine's own drawing undone
            const rect = grid.view().rects.a;
            expect(grid.item("a").style.transform, end).toBe(
                `translate(${rect?.left}px, ${rect?.top}px)`,
            );
            expect(start).toBe("");
        }
    });

    it("lets the app's Escape handler keep the gesture going", () => {
        const grid = setup(two());
        document.body.addEventListener("keydown", (event) =>
            event.preventDefault(),
        );
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 1));
        key(document.body, "Escape");
        expect(grid.view().gesture).toBeDefined();
        press.release(...at(2, 1));
    });

    it("restores the item when a middleware refuses where it would land", () => {
        const grid = setup(two());
        grid.model.use((ctx, next) =>
            ctx.command === "item.move" ? veto() : next(),
        );
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 0));
        // the placeholder shows it going back
        expect(grid.view().gesture?.preview).toBe(grid.model.get("layout"));
        press.release(...at(2, 0));
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
            y: 0,
        });
    });

    it("keeps a bounded item inside the root", () => {
        const grid = setup({ ...two(), engine: { bounded: true } });
        const press = pointer(grid.item("b"), ...at(2, 0));
        press.move(-500, -500);
        expect(grid.item("b").style.transform).toBe("translate(0px, 0px)");
        press.release(-500, -500);
        expect(grid.model.get("item-by", { itemId: "b" })).toMatchObject({
            x: 0,
            y: 0,
        });
    });

    it("swallows the click that ends a drag", () => {
        const grid = setup(two());
        let clicks = 0;
        grid.item("a").addEventListener("click", () => clicks++);
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 0));
        press.release(...at(2, 0));
        grid.item("a").dispatchEvent(
            new MouseEvent("click", { bubbles: true }),
        );
        expect(clicks).toBe(0);
    });

    it("never starts on a static item, a non-draggable one, or when the grid says no", () => {
        const grid = setup({
            layout: [
                item("s", 0, 0, 2, 2, { static: true }),
                item("n", 2, 0, 2, 2, { draggable: false }),
            ],
        });
        for (const id of ["s", "n"]) {
            const press = pointer(grid.item(id), ...at(id === "s" ? 0 : 2, 0));
            press.move(...at(5, 3));
            press.release(...at(5, 3));
        }
        expect(grid.events).toEqual([]);
        const off = setup({ ...two(), engine: { draggable: false } });
        const press = pointer(off.item("a"), ...at(0, 0));
        press.move(...at(5, 3));
        expect(off.events).toEqual([]);
    });

    it("never starts from a control, an opted-out subtree, a vetoed press or another button", () => {
        const grid = setup(two());
        const input = grid.child("a", "input");
        const plot = grid.child("a");
        plot.setAttribute("data-grid-layout-no-drag", "");
        const inner = document.createElement("span");
        plot.append(inner);
        for (const target of [input, inner]) {
            const press = pointer(target, ...at(0, 0));
            press.move(...at(4, 2));
            press.release(...at(4, 2));
        }
        grid.item("a").addEventListener(
            "pointerdown",
            (event) => event.preventDefault(),
            {
                once: true,
            },
        );
        const vetoed = pointer(grid.item("a"), ...at(0, 0));
        vetoed.move(...at(4, 2));
        vetoed.release(...at(4, 2));
        const secondary = pointer(grid.item("a"), ...at(0, 0), { button: 2 });
        secondary.move(...at(4, 2));
        secondary.release(...at(4, 2));
        expect(grid.events).toEqual([]);
    });

    it("drags only from the drag handle once an item has one", () => {
        const grid = setup(two());
        const handle = grid.dragHandle("a");
        expect(grid.view().handled.has("a")).toBe(true);
        const body = pointer(grid.item("a"), ...at(0, 0));
        body.move(...at(4, 2));
        body.release(...at(4, 2));
        expect(grid.events).toEqual([]);
        const press = pointer(handle, ...at(0, 0));
        press.move(...at(4, 0));
        press.release(...at(4, 0));
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 4,
        });
    });

    it("ignores a press inside a grid nested in an item", () => {
        const grid = setup(two());
        const nested = grid.child("a");
        nested.setAttribute("data-grid-layout-part", "root");
        const inner = document.createElement("div");
        nested.append(inner);
        const press = pointer(inner, ...at(0, 0));
        press.move(...at(4, 2));
        expect(grid.events).toEqual([]);
    });

    it("ends the gesture unapplied when the app changes the layout under it", () => {
        const grid = setup(two());
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 1));
        grid.model.run("item.remove", { itemId: "b" });
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.events.at(-1)?.type).toBe("cancel");
    });
});

describe("resizing with a pointer", () => {
    const sides = {
        end: {
            from: item("a", 4, 2, 2, 2),
            dx: 1,
            dy: 0,
            expect: { x: 4, y: 0, w: 3, h: 2 },
        },
        start: {
            from: item("a", 4, 2, 2, 2),
            dx: -1,
            dy: 0,
            expect: { x: 3, y: 0, w: 3, h: 2 },
        },
        bottom: {
            from: item("a", 4, 0, 2, 2),
            dx: 0,
            dy: 1,
            expect: { x: 4, y: 0, w: 2, h: 3 },
        },
        top: {
            from: item("a", 4, 0, 2, 3),
            dx: 0,
            dy: 1,
            expect: { x: 4, y: 0, w: 2, h: 2 },
        },
        "bottom-end": {
            from: item("a", 4, 0, 2, 2),
            dx: 1,
            dy: 1,
            expect: { x: 4, y: 0, w: 3, h: 3 },
        },
        "bottom-start": {
            from: item("a", 4, 0, 2, 2),
            dx: -1,
            dy: 1,
            expect: { x: 3, y: 0, w: 3, h: 3 },
        },
        "top-end": {
            from: item("a", 4, 0, 2, 3),
            dx: 1,
            dy: 1,
            expect: { x: 4, y: 0, w: 3, h: 2 },
        },
        "top-start": {
            from: item("a", 4, 0, 2, 3),
            dx: -1,
            dy: 1,
            expect: { x: 3, y: 0, w: 3, h: 2 },
        },
    } as const;

    for (const dir of ["ltr", "rtl"] as const) {
        for (const [side, test] of Object.entries(sides)) {
            it(`pulls the ${side} side, the opposite edge anchored (${dir})`, () => {
                const grid = setup({ layout: [test.from], dir });
                const handle = grid.resizeHandle(
                    "a",
                    side as keyof typeof sides,
                );
                // pixels on screen: in right-to-left, the inline axis runs the other way
                const sign = dir === "rtl" ? -1 : 1;
                const press = pointer(handle, 600, 100);
                press.move(600 + sign * test.dx * COLUMN, 100 + test.dy * ROW);
                expect(grid.view().gesture?.kind).toBe("resize");
                press.release(
                    600 + sign * test.dx * COLUMN,
                    100 + test.dy * ROW,
                );
                expect(
                    grid.model.get("item-by", { itemId: "a" }),
                ).toMatchObject(test.expect);
            });
        }
    }

    it("draws the held item at the pointer's size and tells resize events", () => {
        const grid = setup({ layout: [item("a", 0, 0, 2, 2)] });
        const handle = grid.resizeHandle("a", "bottom-end");
        const press = pointer(handle, 200, 120);
        press.move(200 + 40, 120 + 25);
        expect(grid.item("a").style.width).toBe(
            `${(grid.view().rects.a?.width ?? 0) + 40}px`,
        );
        press.release(200 + 40, 120 + 25);
        expect(grid.events.map((event) => event.type)).toEqual([
            "resize-start",
            "resize",
            "resize",
            "resize-stop",
        ]);
    });

    it("never resizes a non-resizable item, or when the grid says no", () => {
        const grid = setup({
            layout: [item("a", 0, 0, 2, 2, { resizable: false })],
        });
        const press = pointer(grid.resizeHandle("a", "end"), 200, 50);
        press.move(500, 50);
        expect(grid.events).toEqual([]);
    });
});

describe("the keyboard", () => {
    it("grabs, moves, resizes and drops an item as one command", () => {
        const grid = setup(two());
        const committed: string[] = [];
        grid.model.subscribe((event) => committed.push(event.command));
        const a = grid.item("a");
        a.focus();
        expect(key(a, " ").defaultPrevented).toBe(true);
        expect(grid.view().gesture?.kind).toBe("keyboard");
        key(a, "ArrowDown");
        key(a, "ArrowRight", { shiftKey: true });
        // the held item itself shows where it would land
        expect(grid.view().rects.a).toEqual(grid.view().gesture?.placeholder);
        key(a, "Enter");
        expect(committed).toEqual(["item.place"]);
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
            w: 3,
            h: 2,
        });
        expect(grid.events.map((event) => event.type)).toEqual([
            "grab",
            "move",
            "resize",
            "drop",
        ]);
    });

    it("moves with a single command when it only moves", () => {
        const grid = setup(two());
        const committed: string[] = [];
        grid.model.subscribe((event) => committed.push(event.command));
        const b = grid.item("b");
        key(b, "Enter");
        key(b, "ArrowLeft");
        key(b, "ArrowLeft");
        key(b, " ");
        expect(committed).toEqual(["item.move"]);
        expect(grid.model.get("item-by", { itemId: "b" })).toMatchObject({
            x: 0,
            y: 0,
        });
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
            y: 2,
        });
    });

    it("puts the item back on Escape, Tab and a focus leaving it", () => {
        for (const end of ["Escape", "Tab", "blur"] as const) {
            const grid = setup(two());
            const a = grid.item("a");
            a.focus();
            key(a, " ");
            key(a, "ArrowRight");
            key(a, "ArrowRight");
            if (end === "blur") document.body.focus();
            else key(a, end);
            if (end === "blur") a.dispatchEvent(new FocusEvent("focusout"));
            expect(grid.view().gesture, end).toBeUndefined();
            expect(
                grid.model.get("item-by", { itemId: "a" }),
                end,
            ).toMatchObject({ x: 0 });
            expect(grid.events.at(-1)?.type, end).toBe("cancel");
        }
    });

    it("moves by what the arrows show in right-to-left", () => {
        const grid = setup({ layout: [item("a", 4, 0, 2, 2)], dir: "rtl" });
        const a = grid.item("a");
        key(a, " ");
        key(a, "ArrowRight");
        key(a, "Enter");
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 3,
        });
    });

    it("does not take a step a middleware refuses, nor leave the grid", () => {
        const grid = setup(two());
        grid.model.use((ctx, next) =>
            ctx.command === "item.move" && ctx.payload.y > 0 ? veto() : next(),
        );
        const a = grid.item("a");
        key(a, " ");
        key(a, "ArrowLeft");
        key(a, "ArrowDown");
        expect(grid.view().gesture?.preview).toBe(grid.model.get("layout"));
        key(a, "Escape");
    });

    it("lets the app's key handler replace a key", () => {
        const grid = setup(two());
        const a = grid.item("a");
        a.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight") event.preventDefault();
        });
        key(a, " ");
        key(a, "ArrowRight");
        expect(grid.view().gesture?.preview).toBe(grid.model.get("layout"));
    });

    it("grabs only from the item's tab stop, never from a control inside it", () => {
        const grid = setup(two());
        const input = grid.child("a", "input");
        key(input, " ");
        key(input, "Enter");
        expect(grid.view().gesture).toBeUndefined();
        const handle = grid.dragHandle("b");
        key(handle, "Enter");
        expect(grid.view().gesture?.itemId).toBe("b");
    });

    it("gives pointer and keyboard the same layout for the same move", () => {
        const byPointer = setup(two());
        const press = pointer(byPointer.item("a"), ...at(0, 0));
        press.move(...at(2, 1));
        press.release(...at(2, 1));
        const byKeys = setup(two());
        const a = byKeys.item("a");
        key(a, " ");
        for (const name of ["ArrowRight", "ArrowRight", "ArrowDown"])
            key(a, name);
        key(a, "Enter");
        expect(byKeys.model.get("layout")).toEqual(
            byPointer.model.get("layout"),
        );
    });
});

describe("the review's cases", () => {
    it("previews a resize from the start exactly where it commits", () => {
        const grid = setup({ layout: [item("a", 4, 0, 2, 2)] });
        const press = pointer(grid.resizeHandle("a", "start"), 500, 40);
        press.move(500 - 2 * COLUMN, 40);
        const previewed = grid
            .view()
            .gesture?.preview.find((entry) => entry.id === "a");
        expect(previewed).toMatchObject({ x: 2, w: 4 });
        press.release(500 - 2 * COLUMN, 40);
        expect(grid.model.get("item-by", { itemId: "a" })).toEqual(previewed);
    });

    it("lets the keyboard shrink an item and take it to the last columns", () => {
        const grid = setup({ layout: [item("a", 0, 0, 4, 1)] });
        const a = grid.item("a");
        key(a, " ");
        key(a, "ArrowLeft", { shiftKey: true });
        key(a, "ArrowLeft", { shiftKey: true });
        for (let i = 0; i < 12; i++) key(a, "ArrowRight");
        key(a, "Enter");
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 10,
            w: 2,
        });
    });

    it("item.place checks the grid with the new size", () => {
        const grid = setup({ layout: [item("a", 0, 0, 4, 1)] });
        expect(
            grid.model.run("item.place", {
                itemId: "a",
                x: 10,
                y: 0,
                w: 2,
                h: 1,
            }),
        ).toMatchObject({ ok: true, value: { item: { x: 10, w: 2 } } });
        expect(
            grid.model.run("item.place", {
                itemId: "a",
                x: 10,
                y: 0,
                w: 4,
                h: 1,
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("bounds a drag by the root's own height without autoSize", () => {
        const grid = setup({
            ...two(),
            compactor: noCompactor,
            engine: { bounded: true, autoSize: false },
        });
        Object.defineProperty(grid.root, "clientHeight", { get: () => 300 });
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(at(0, 0)[0], at(0, 0)[1] + 2 * ROW);
        expect(
            grid.view().gesture?.preview.find((entry) => entry.id === "a")?.y,
        ).toBe(2);
        press.move(at(0, 0)[0], 5000);
        // 300px tall: the item (110px) stops at 190px, row 3
        expect(grid.item("a").style.transform).toBe("translate(10px, 190px)");
        press.release(at(0, 0)[0], 5000);
    });
});

describe("the app's side", () => {
    it("reads the gesture, an item's box and the cell at a point", () => {
        const grid = setup(two());
        expect(grid.engine.get("item-rect-by", { itemId: "a" })).toEqual(
            grid.view().rects.a,
        );
        expect(
            grid.engine.get("cell-at", {
                clientX: at(3, 2)[0],
                clientY: at(3, 2)[1],
            }),
        ).toEqual({
            x: 3,
            y: 2,
        });
        expect(grid.engine.get("dir")).toBe("ltr");
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(1, 1));
        expect(grid.engine.get("gesture")?.itemId).toBe("a");
        expect(grid.engine.is("item-active-by", { itemId: "a" })).toBe(true);
        expect(grid.engine.run("cancel-gesture")).toBe(true);
        expect(grid.engine.run("cancel-gesture")).toBe(false);
    });

    it("focuses an item, or its drag handle", () => {
        const grid = setup(two());
        expect(grid.engine.run("focus-item", { itemId: "a" })).toBe(true);
        expect(document.activeElement).toBe(grid.item("a"));
        const handle = grid.dragHandle("b");
        handle.tabIndex = 0;
        grid.engine.run("focus-item", { itemId: "b" });
        expect(document.activeElement).toBe(handle);
        expect(grid.engine.run("focus-item", { itemId: "nope" })).toBe(false);
    });

    it("mirrors positions in right-to-left", () => {
        const grid = setup({ layout: [item("a", 0, 0, 2, 2)], dir: "rtl" });
        expect(grid.view().dir).toBe("rtl");
        const press = pointer(grid.item("a"), 1200 - 20, 20);
        press.move(1200 - 20 - COLUMN * 2, 20);
        press.release(1200 - 20 - COLUMN * 2, 20);
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 2,
        });
    });

    it("tells events with objects nobody changes afterwards", () => {
        const grid = setup(two());
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(2, 0));
        const snapshot = JSON.stringify(grid.events);
        press.move(...at(3, 1));
        press.release(...at(3, 1));
        expect(
            JSON.stringify(grid.events.slice(0, JSON.parse(snapshot).length)),
        ).toBe(snapshot);
    });

    it("stops listening when detached and destroyed", () => {
        const grid = setup(two());
        grid.detach();
        grid.engine.destroy();
        const press = pointer(grid.item("a"), ...at(0, 0));
        press.move(...at(3, 1));
        expect(grid.events).toEqual([]);
    });
});
