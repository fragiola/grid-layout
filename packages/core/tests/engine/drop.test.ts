// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    dragPreviewPart,
    dragSourcePart,
    itemPart,
    placeholderPart,
    rootPart,
} from "../../src/engine/parts";
import type { ExternalDragAnswer } from "../../src/engine/types";
import { noCompactor } from "../../src/layout/compact";
import { itemPixels } from "../../src/layout/geometry";
import type { Layout, LayoutItem } from "../../src/layout/types";
import { veto } from "../../src/model/model";
import type { CommandEvent } from "../../src/model/types";
import { flush, key, nativeDrag, pointer, setup } from "./harness";

// Drops from outside the grid (X1–X3, X6): a drag source by pointer and by keyboard, a native drag
// from another window, and an item dragged off the grid. The grid is the harness's: 12 columns on
// a 1200px root at the viewport's corner, rows of 50px every 60px.

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
): LayoutItem => ({ id, x, y, w, h });

const two = () => ({ layout: [item("a", 0, 0, 2, 2), item("b", 2, 0, 2, 2)] });

type Grid = ReturnType<typeof setup>;

/** The viewport point at the centre of a box: where a pointer drops an item there. */
function centre(grid: Grid, x: number, y: number, w: number, h: number) {
    const geometry = grid.view().geometry;
    if (!geometry) throw new Error("not measured");
    const box = itemPixels(geometry, { x, y, w, h });
    const left = box.left + box.width / 2;
    const physical = grid.view().dir === "rtl" ? 1200 - left : left;
    return [physical, box.top + box.height / 2] as const;
}

/** The geometry of a layout, by position: ids aside (a preview's stand-in id). */
const shapes = (layout: Layout) =>
    layout
        .map(({ x, y, w, h }) => ({ x, y, w, h }))
        .sort((p, q) => p.y - q.y || p.x - q.x);

/** Every model event, to prove none fires before the drop. */
function changes(grid: Grid): CommandEvent[] {
    const told: CommandEvent[] = [];
    grid.model.subscribe((event) => told.push(event));
    return told;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a drop from a drag source, by pointer", () => {
    it("previews the new item under the pointer, pushing others, and commits one item.add", () => {
        const grid = setup(two());
        const told = changes(grid);
        const source = grid.source({
            item: { w: 2, h: 2 },
            data: { kind: "chart" },
        });
        const press = pointer(source, 1300, 500);
        press.move(...centre(grid, 2, 0, 2, 2));
        const gesture = grid.view().gesture;
        expect(gesture).toMatchObject({
            kind: "drop",
            source: "pointer",
            outside: false,
            refused: false,
            data: { kind: "chart" },
            origin: source,
        });
        expect(gesture?.preview).toContainEqual(
            expect.objectContaining({ x: 2, y: 0, w: 2, h: 2 }),
        );
        expect(gesture?.preview).toContainEqual(
            expect.objectContaining({ id: "b", x: 2, y: 2 }),
        );
        // the preview never enters the model
        expect(grid.model.get("layout")).toHaveLength(2);
        expect(told).toHaveLength(0);
        const preview = gesture?.preview ?? [];
        press.release(...centre(grid, 2, 0, 2, 2));
        expect(told).toHaveLength(1);
        expect(told[0]?.command).toBe("item.add");
        const layout = grid.model.get("layout");
        expect(shapes(layout)).toEqual(shapes(preview));
        const drop = grid.events.at(-1);
        expect(drop).toMatchObject({
            type: "drop",
            source: "pointer",
            external: true,
            data: { kind: "chart" },
            item: { x: 2, y: 0, w: 2, h: 2 },
        });
        expect(drop?.itemId).toMatch(UUID);
        expect(layout.some((entry) => entry.id === drop?.itemId)).toBe(true);
        // the release's own position is a last frame
        expect(grid.events.map((event) => event.type)).toEqual([
            "drop-start",
            "drop-over",
            "drop-over",
            "drop",
        ]);
        expect(grid.view().gesture).toBeUndefined();
    });

    it("tells the source each event came from", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        press.release(...centre(grid, 5, 0, 1, 1));
        expect(grid.events.map((event) => event.origin)).toEqual(
            grid.events.map(() => source),
        );
    });

    it("keeps its press when it sits inside an item", () => {
        const grid = setup(two());
        const inner = grid.child("a");
        inner.addEventListener("pointerdown", (event) =>
            grid.engine.adapter.startExternalDrag(event, inner, {
                item: { w: 1, h: 1 },
            }),
        );
        const press = pointer(inner, 20, 20);
        press.move(...centre(grid, 6, 0, 1, 1));
        expect(grid.view().gesture?.kind).toBe("drop");
        press.release(...centre(grid, 6, 0, 1, 1));
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
            y: 0,
        });
        expect(grid.model.get("layout")).toHaveLength(3);
    });

    it("stays a click under the threshold", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 } });
        const press = pointer(source, 100, 100);
        press.move(101, 101);
        expect(grid.view().gesture).toBeUndefined();
        press.release(101, 101);
        expect(grid.events).toHaveLength(0);
    });

    it("removes the preview off the grid, and drops nothing there", () => {
        const grid = setup(two());
        const told = changes(grid);
        const start = grid.model.get("layout");
        const source = grid.source({ item: { w: 2, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 2, 0, 2, 1));
        expect(grid.view().gesture?.preview).toHaveLength(3);
        expect(rootPart(grid.view()).attributes).toHaveProperty(
            "data-dropping",
        );
        press.move(1300, 20);
        const view = grid.view();
        expect(view.gesture?.outside).toBe(true);
        expect(view.gesture?.preview).toBe(start);
        expect(placeholderPart(view)).toBeUndefined();
        expect(rootPart(view).attributes).not.toHaveProperty("data-dropping");
        expect(rootPart(view).attributes).toHaveProperty("data-outside");
        press.release(1300, 20);
        expect(grid.model.get("layout")).toBe(start);
        expect(told).toHaveLength(0);
        expect(grid.events.at(-1)).toMatchObject({
            type: "drop-cancel",
            external: true,
            outside: true,
        });
    });

    it("cancels on Escape, the layout untouched", () => {
        const grid = setup(two());
        const told = changes(grid);
        const source = grid.source({ item: { w: 2, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 4, 0, 2, 1));
        key(document.body, "Escape");
        press.release(...centre(grid, 4, 0, 2, 1));
        expect(grid.model.get("layout")).toHaveLength(2);
        expect(told).toHaveLength(0);
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
        expect(grid.view().gesture).toBeUndefined();
    });

    it("places the item centred under the pointer, moved by the drag offset, mirrored in rtl", () => {
        for (const dir of ["ltr", "rtl"] as const) {
            const grid = setup({ ...two(), dir, compactor: noCompactor });
            const source = grid.source({
                item: { w: 2, h: 1 },
                dragOffset: { x: 0, y: 60 },
            });
            const press = pointer(source, 1300, 20);
            // the pointer at row 0's centre: the item one row lower, by the offset
            press.move(...centre(grid, 6, 0, 2, 1));
            press.release(...centre(grid, 6, 0, 2, 1));
            expect(grid.events.at(-1)?.item, dir).toMatchObject({
                x: 6,
                y: 1,
            });
        }
    });

    it("keeps a bounded drop inside the grid", () => {
        const grid = setup({ ...two(), engine: { bounded: true } });
        const source = grid.source({ item: { w: 3, h: 1 } });
        const press = pointer(source, 1300, 20);
        // the pointer near the end edge: an unbounded item would hang past it
        press.move(1190, 20);
        press.release(1190, 20);
        expect(grid.events.at(-1)?.item).toMatchObject({ x: 9, w: 3 });
    });

    it("draws the drag preview at the pointer, and only during a pointer drop", () => {
        const grid = setup(two());
        const source = grid.source({
            item: { w: 1, h: 1 },
            data: "note",
            dragOffset: { x: 4, y: -2 },
        });
        expect(dragPreviewPart(grid.view())).toBeUndefined();
        const press = pointer(source, 1300, 20);
        press.move(300, 40);
        const preview = document.createElement("div");
        const unregister = grid.engine.adapter.registerDragPreview(preview);
        expect(preview.style.transform).toBe(
            "translate(304px, 38px) translate(-50%, -50%)",
        );
        press.move(320, 50);
        expect(preview.style.transform).toBe(
            "translate(324px, 48px) translate(-50%, -50%)",
        );
        expect(dragPreviewPart(grid.view())).toMatchObject({
            state: { data: "note", over: true, refused: false },
            style: { position: "fixed", pointerEvents: "none" },
        });
        expect(dragSourcePart(grid.view(), source, false).state).toEqual({
            dragging: true,
            grabbed: false,
            disabled: false,
        });
        press.release(320, 50);
        unregister();
        expect(dragPreviewPart(grid.view())).toBeUndefined();
    });

    it("lets a drop below the grid's bottom grow it, within the item's height", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 2, h: 2 } });
        const press = pointer(source, 1300, 20);
        // the root ends at 130px; the pointer 40px below it, the item's centre
        press.move(...centre(grid, 0, 2, 2, 2));
        expect(grid.view().gesture?.outside).toBe(false);
        press.release(...centre(grid, 0, 2, 2, 2));
        expect(grid.events.at(-1)?.item).toMatchObject({ x: 0, y: 2 });
    });
});

describe("the model decides a drop", () => {
    it("shows a refused drop as refused, and drops nothing", () => {
        const grid = setup(two());
        grid.model.use((ctx, next) =>
            ctx.command === "item.add" ? veto() : next(),
        );
        const told = changes(grid);
        const source = grid.source({ item: { w: 2, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 4, 0, 2, 1));
        const view = grid.view();
        expect(view.gesture?.refused).toBe(true);
        expect(view.dropRefused).toBe(true);
        expect(view.gesture?.preview).toBe(grid.model.get("layout"));
        expect(placeholderPart(view)).toBeUndefined();
        expect(rootPart(view).attributes).toHaveProperty("data-drop-refused");
        press.release(...centre(grid, 4, 0, 2, 1));
        expect(told).toHaveLength(0);
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
        expect(grid.view().dropRefused).toBe(false);
    });

    it("previews and drops a middleware's new size and id alike", () => {
        const grid = setup(two());
        grid.model.use((ctx, next) => {
            if (ctx.command === "item.add") {
                ctx.payload = {
                    item: { ...ctx.payload.item, id: "chart-1", w: 4 },
                };
            }
            return next();
        });
        const source = grid.source({ item: { w: 2, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 4, 0, 2, 1));
        const preview = grid.view().gesture?.preview ?? [];
        expect(preview).toContainEqual(
            expect.objectContaining({ id: "chart-1", x: 4, w: 4 }),
        );
        expect(grid.view().rects["chart-1"]).toBeDefined();
        press.release(...centre(grid, 4, 0, 2, 1));
        expect(grid.model.get("layout")).toEqual(preview);
        expect(grid.events.at(-1)).toMatchObject({
            type: "drop",
            itemId: "chart-1",
            item: { id: "chart-1", w: 4 },
        });
    });

    it("takes the source's id, else the createId option's, else a random UUID", () => {
        const kept = setup(two());
        const withId = kept.source({ item: { w: 1, h: 1 }, itemId: "kept" });
        let press = pointer(withId, 1300, 20);
        press.move(...centre(kept, 5, 0, 1, 1));
        press.release(...centre(kept, 5, 0, 1, 1));
        expect(kept.events.at(-1)?.itemId).toBe("kept");

        let next = 0;
        const made = setup({
            ...two(),
            engine: { createId: () => `made-${++next}` },
        });
        press = pointer(made.source({ item: { w: 1, h: 1 } }), 1300, 20);
        press.move(...centre(made, 5, 0, 1, 1));
        press.release(...centre(made, 5, 0, 1, 1));
        expect(made.events.at(-1)?.itemId).toBe("made-1");
        // the preview made no id: one per drop
        expect(next).toBe(1);
    });

    it("refuses a source whose id the layout already holds, and leaves that item alone", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 }, itemId: "a" });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        expect(grid.view().dropRefused).toBe(true);
        expect(itemPart(grid.view(), "a").state.dragging).toBe(false);
        press.move(1300, 20);
        expect(itemPart(grid.view(), "a").attributes).not.toHaveProperty(
            "data-outside",
        );
        press.release(1300, 20);
        expect(grid.model.get("layout")).toHaveLength(2);
    });

    it("previews under the id it commits, for a rule that reads ids", () => {
        let next = 0;
        const grid = setup({
            ...two(),
            engine: { createId: () => `w-${++next}` },
        });
        // a rule on ids: the preview's verdict is the drop's
        grid.model.use((ctx, next) =>
            ctx.command === "item.add" && !ctx.payload.item.id.startsWith("w-")
                ? veto()
                : next(),
        );
        const source = grid.source({ item: { w: 1, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        expect(grid.view().gesture?.itemId).toBe("w-1");
        expect(grid.view().dropRefused).toBe(false);
        press.release(...centre(grid, 5, 0, 1, 1));
        expect(grid.events.at(-1)).toMatchObject({
            type: "drop",
            itemId: "w-1",
        });
    });

    it("shows refused a new id the layout already holds, as the drop would be", () => {
        const grid = setup({ ...two(), engine: { createId: () => "a" } });
        const source = grid.source({ item: { w: 1, h: 1 } });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        expect(grid.view().dropRefused).toBe(true);
        press.release(...centre(grid, 5, 0, 1, 1));
        expect(grid.model.get("layout")).toHaveLength(2);
    });

    it("adds only the item's size and limits, never what else the app's object carries", () => {
        const grid = setup(two());
        const source = grid.source({
            item: { w: 1, h: 1, minW: 1, data: "x" } as never,
            data: { big: true },
        });
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        press.release(...centre(grid, 5, 0, 1, 1));
        const added = grid.events.at(-1)?.item;
        expect(added && Object.keys(added).sort()).toEqual(
            ["h", "id", "minW", "w", "x", "y"].sort(),
        );
    });
});

describe("a drop from a drag source, by keyboard", () => {
    it("grabs a new item at the first free cell, steps, sizes, drops it and focuses it", () => {
        const grid = setup(two());
        const told = changes(grid);
        const source = grid.source({ item: { w: 2, h: 1 }, data: "note" });
        source.focus();
        key(source, "Enter");
        const gesture = grid.view().gesture;
        expect(gesture).toMatchObject({
            kind: "drop",
            source: "keyboard",
            outside: false,
        });
        expect(gesture?.preview).toContainEqual(
            expect.objectContaining({ x: 4, y: 0, w: 2, h: 1 }),
        );
        expect(dragSourcePart(grid.view(), source, false).state.grabbed).toBe(
            true,
        );
        expect(placeholderPart(grid.view())?.state.kind).toBe("drop");
        key(source, "ArrowRight");
        key(source, "ArrowDown", { shiftKey: true });
        expect(told).toHaveLength(0);
        key(source, "Enter");
        expect(told).toHaveLength(1);
        const dropped = grid.events.at(-1);
        expect(dropped).toMatchObject({
            type: "drop",
            source: "keyboard",
            external: true,
            data: "note",
            item: { x: 5, y: 0, w: 2, h: 2 },
        });
        expect(
            grid.events.map((event) => [event.type, event.external]),
        ).toEqual([
            ["grab", true],
            ["move", true],
            ["resize", true],
            ["drop", true],
        ]);
        // the new item takes the focus once it is on the page
        const element = grid.mount(dropped?.itemId ?? "");
        expect(document.activeElement).toBe(element);
    });

    it("forgets the focus it owes once the app runs another command", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 }, itemId: "late" });
        source.focus();
        key(source, "Enter");
        key(source, "Enter");
        grid.model.run("item.remove", { itemId: "late" });
        grid.model.run("item.add", { item: item("late", 8, 0, 1, 1) });
        const element = grid.mount("late");
        expect(document.activeElement).not.toBe(element);
    });

    it("gives up on Escape, Tab and the focus leaving, the layout untouched", () => {
        for (const end of ["Escape", "Tab", "blur"] as const) {
            const grid = setup(two());
            const told = changes(grid);
            const source = grid.source({ item: { w: 2, h: 1 } });
            source.focus();
            key(source, " ");
            key(source, "ArrowDown");
            if (end === "blur") source.blur();
            else key(source, end);
            expect(grid.view().gesture, end).toBeUndefined();
            expect(grid.model.get("layout"), end).toHaveLength(2);
            expect(told, end).toHaveLength(0);
            expect(grid.events.at(-1), end).toMatchObject({
                type: "cancel",
                external: true,
            });
        }
    });

    it("steps out of a cell the rules refuse, refused until it is out", () => {
        const grid = setup(two());
        // nothing past the seventh column
        grid.model.use((ctx, next) =>
            ctx.command === "item.add" &&
            (ctx.payload.item.x ?? 0) + ctx.payload.item.w > 7
                ? veto()
                : next(),
        );
        // the first free cell for 4 × 1 is (4, 0): refused
        const source = grid.source({ item: { w: 4, h: 1 } });
        source.focus();
        key(source, "Enter");
        expect(grid.view().dropRefused).toBe(true);
        key(source, "ArrowRight");
        expect(grid.view().gesture?.refused).toBe(true);
        expect(grid.events.at(-1)?.item).toMatchObject({ x: 5 });
        key(source, "ArrowDown");
        key(source, "ArrowLeft");
        key(source, "ArrowLeft");
        // column 3 is allowed: shown, and from there a refused step is not taken
        expect(grid.view().dropRefused).toBe(false);
        key(source, "ArrowRight");
        expect(grid.view().dropRefused).toBe(false);
        key(source, "Enter");
        expect(grid.events.at(-1)).toMatchObject({
            type: "drop",
            item: { x: 3, w: 4 },
        });
    });

    it("takes a held key's repeat for no second press", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 2, h: 1 } });
        source.focus();
        key(source, " ");
        key(source, " ", { repeat: true });
        expect(grid.view().gesture?.kind).toBe("drop");
        expect(grid.model.get("layout")).toHaveLength(2);
        key(source, "Escape");
        key(source, "Enter", { repeat: true });
        expect(grid.view().gesture).toBeUndefined();
    });

    it("lets the app's handler keep its key, and grabs only on Space or Enter", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 2, h: 1 } });
        key(source, "a");
        key(source, "Enter", { ctrlKey: true });
        expect(grid.view().gesture).toBeUndefined();
        source.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Enter") event.preventDefault();
            },
            { capture: true },
        );
        key(source, "Enter");
        expect(grid.view().gesture).toBeUndefined();
    });
});

describe("a native drag from another window", () => {
    function native(answer: (event: DragEvent) => ExternalDragAnswer) {
        const onExternalDrag = vi.fn(answer);
        return {
            grid: setup({ ...two(), engine: { onExternalDrag } }),
            onExternalDrag,
        };
    }

    it("lets a drag the app ignores pass", () => {
        const { grid } = native(() => undefined);
        const enter = nativeDrag(grid.root, "dragenter", 300, 20);
        expect(enter.defaultPrevented).toBe(false);
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.view().dropRefused).toBe(false);
    });

    it("refuses a drag the app refuses, through nested elements, until it leaves", () => {
        const { grid, onExternalDrag } = native(() => false);
        const enter = nativeDrag(grid.root, "dragenter", 300, 20);
        expect(enter.defaultPrevented).toBe(true);
        expect(enter.dataTransfer.dropEffect).toBe("none");
        expect(grid.view().dropRefused).toBe(true);
        expect(rootPart(grid.view()).attributes).toHaveProperty(
            "data-drop-refused",
        );
        // into an item: entered there before it leaves the root
        nativeDrag(grid.item("a"), "dragenter", 20, 20);
        nativeDrag(grid.root, "dragleave", 20, 20);
        expect(grid.view().dropRefused).toBe(true);
        const over = nativeDrag(grid.item("a"), "dragover", 25, 20);
        expect(over.dataTransfer.dropEffect).toBe("none");
        nativeDrag(grid.item("a"), "dragleave", 1300, 20);
        expect(grid.view().dropRefused).toBe(false);
        expect(onExternalDrag).toHaveBeenCalledTimes(1);
    });

    it("drops what the app accepts, with the data it gives on the drop", () => {
        const { grid, onExternalDrag } = native((event) => ({
            w: 2,
            h: 1,
            data: Array.from(
                (event.dataTransfer?.files ?? []) as ArrayLike<{
                    name: string;
                }>,
                (file) => file.name,
            ),
        }));
        const told = changes(grid);
        const enter = nativeDrag(
            grid.root,
            "dragenter",
            ...centre(grid, 4, 0, 2, 1),
        );
        expect(enter.defaultPrevented).toBe(true);
        expect(enter.dataTransfer.dropEffect).toBe("copy");
        expect(grid.view().gesture).toMatchObject({
            kind: "drop",
            source: "native",
            outside: false,
        });
        nativeDrag(grid.item("a"), "dragenter", ...centre(grid, 6, 0, 2, 1));
        nativeDrag(grid.root, "dragleave", ...centre(grid, 6, 0, 2, 1));
        nativeDrag(grid.item("a"), "dragover", ...centre(grid, 6, 0, 2, 1));
        flush();
        expect(grid.view().gesture?.preview).toContainEqual(
            expect.objectContaining({ x: 6, y: 0 }),
        );
        expect(told).toHaveLength(0);
        const drop = nativeDrag(
            grid.item("a"),
            "drop",
            ...centre(grid, 6, 0, 2, 1),
            ["plan.pdf"],
        );
        expect(drop.defaultPrevented).toBe(true);
        expect(told).toHaveLength(1);
        expect(onExternalDrag).toHaveBeenCalledTimes(2);
        expect(grid.events.at(-1)).toMatchObject({
            type: "drop",
            source: "native",
            external: true,
            data: ["plan.pdf"],
            item: { x: 6, y: 0, w: 2, h: 1 },
        });
        expect(grid.view().gesture).toBeUndefined();
    });

    it("leaves a drag over a grid nested in an item to that grid", () => {
        const { grid, onExternalDrag } = native(() => ({ w: 1, h: 1 }));
        const nested = grid.child("a");
        nested.setAttribute("data-grid-layout-part", "root");
        const inner = document.createElement("div");
        nested.append(inner);
        const enter = nativeDrag(inner, "dragenter", 20, 20);
        nativeDrag(inner, "drop", 20, 20);
        expect(enter.defaultPrevented).toBe(false);
        expect(onExternalDrag).not.toHaveBeenCalled();
        expect(grid.model.get("layout")).toHaveLength(2);
    });

    it("restores the layout when the drag leaves", () => {
        const { grid } = native(() => ({ w: 2, h: 1 }));
        const told = changes(grid);
        const start = grid.model.get("layout");
        nativeDrag(grid.root, "dragenter", ...centre(grid, 0, 0, 2, 1));
        expect(grid.view().gesture?.preview).not.toBe(start);
        nativeDrag(grid.root, "dragleave", 1300, 20);
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.model.get("layout")).toBe(start);
        expect(told).toHaveLength(0);
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
    });

    it("keeps no data of the answer in the item", () => {
        const { grid } = native(() => ({ w: 1, h: 1, data: "file" }));
        nativeDrag(grid.root, "dragenter", ...centre(grid, 5, 0, 1, 1));
        nativeDrag(grid.root, "drop", ...centre(grid, 5, 0, 1, 1));
        const added = grid.events.at(-1);
        expect(added?.data).toBe("file");
        expect(added?.item).not.toHaveProperty("data");
    });

    it("ends a drag the browser says left the root, whatever the count", () => {
        const { grid } = native(() => ({ w: 1, h: 1 }));
        nativeDrag(grid.root, "dragenter", ...centre(grid, 5, 0, 1, 1));
        // an item entered, then removed mid-drag: its own leave never comes
        nativeDrag(grid.item("a"), "dragenter", 20, 20);
        const away = new MouseEvent("dragleave", {
            bubbles: true,
            relatedTarget: document.body,
        });
        grid.root.dispatchEvent(away);
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
    });

    it("refuses a native drag while the keyboard holds an item", () => {
        const { grid, onExternalDrag } = native(() => ({ w: 1, h: 1 }));
        grid.item("a").focus();
        key(grid.item("a"), " ");
        const enter = nativeDrag(grid.root, "dragenter", 300, 20);
        expect(enter.defaultPrevented).toBe(true);
        expect(enter.dataTransfer.dropEffect).toBe("none");
        expect(onExternalDrag).not.toHaveBeenCalled();
        expect(grid.view().gesture?.kind).toBe("keyboard");
    });

    it("starts again over a layout the app changed under the drag", () => {
        const { grid } = native(() => ({ w: 1, h: 1 }));
        nativeDrag(grid.root, "dragenter", ...centre(grid, 5, 0, 1, 1));
        grid.model.run("item.add", { item: item("c", 8, 0, 1, 1) });
        expect(grid.view().gesture).toBeUndefined();
        nativeDrag(grid.root, "dragover", ...centre(grid, 5, 0, 1, 1));
        expect(grid.view().gesture?.kind).toBe("drop");
        nativeDrag(grid.root, "drop", ...centre(grid, 5, 0, 1, 1));
        expect(grid.model.get("layout")).toHaveLength(4);
    });

    it("drops nothing when the app refuses on the drop", () => {
        let dropping = false;
        const { grid } = native(() => (dropping ? false : { w: 1, h: 1 }));
        nativeDrag(grid.root, "dragenter", ...centre(grid, 5, 0, 1, 1));
        dropping = true;
        nativeDrag(grid.root, "drop", ...centre(grid, 5, 0, 1, 1));
        expect(grid.model.get("layout")).toHaveLength(2);
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
    });
});

describe("dragging an item off the grid", () => {
    it("brings it back in the preview, and reports the release with the target", () => {
        const grid = setup(two());
        const told = changes(grid);
        const trash = document.createElement("div");
        document.body.append(trash);
        Object.defineProperty(document, "elementsFromPoint", {
            configurable: true,
            value: () => [grid.item("a"), trash, document.body],
        });
        const press = pointer(grid.item("a"), 20, 20);
        press.move(...centre(grid, 4, 0, 2, 2));
        expect(grid.view().gesture?.preview).not.toBe(grid.model.get("layout"));
        press.move(1300, 20);
        const view = grid.view();
        expect(view.gesture?.outside).toBe(true);
        expect(view.gesture?.preview).toBe(grid.model.get("layout"));
        expect(itemPart(view, "a").attributes).toHaveProperty("data-outside");
        expect(rootPart(view).attributes).toHaveProperty("data-outside");
        expect(grid.events.at(-1)).toMatchObject({
            type: "drag",
            outside: true,
        });
        press.release(1300, 20);
        expect(told).toHaveLength(0);
        expect(grid.events.at(-1)).toMatchObject({
            type: "drag-stop",
            outside: true,
            target: trash,
            external: false,
        });
        Reflect.deleteProperty(document, "elementsFromPoint");
    });

    it("is off the grid by its centre: a pointer overshooting the edge column still lands", () => {
        const grid = setup(two());
        // grabbed near its end edge, the item drawn mostly inside while the pointer is past it
        const press = pointer(grid.item("b"), 2 * (1190 / 12) + 180, 20);
        press.move(1210, 20);
        expect(grid.view().gesture?.outside).toBe(false);
        press.release(1210, 20);
        expect(grid.model.get("item-by", { itemId: "b" })).toMatchObject({
            x: 10,
        });
    });

    it("comes back in when the pointer does, and a bounded grid never lets it out", () => {
        const grid = setup(two());
        const press = pointer(grid.item("a"), 20, 20);
        press.move(1300, 20);
        press.move(...centre(grid, 6, 0, 2, 2));
        expect(grid.view().gesture?.outside).toBe(false);
        press.release(...centre(grid, 6, 0, 2, 2));
        expect(grid.events.at(-1)).toMatchObject({
            type: "drag-stop",
            outside: false,
            target: null,
        });

        const bounded = setup({ ...two(), engine: { bounded: true } });
        const held = pointer(bounded.item("a"), 20, 20);
        held.move(1300, 20);
        expect(bounded.view().gesture?.outside).toBe(false);
        held.release(1300, 20);
    });
});

describe("listeners", () => {
    /** The document's listeners added and not removed since it started counting. */
    function counting() {
        const live = new Map<string, number>();
        const add = document.addEventListener.bind(document);
        const remove = document.removeEventListener.bind(document);
        vi.spyOn(document, "addEventListener").mockImplementation(
            (type, listener, options) => {
                live.set(type, (live.get(type) ?? 0) + 1);
                add(type, listener, options);
            },
        );
        vi.spyOn(document, "removeEventListener").mockImplementation(
            (type, listener, options) => {
                live.set(type, (live.get(type) ?? 0) - 1);
                remove(type, listener, options);
            },
        );
        return () => [...live.values()].reduce((sum, n) => sum + n, 0);
    }

    it("removes every one when the source leaves mid-drag", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 } });
        const live = counting();
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        expect(live()).toBeGreaterThan(0);
        grid.engine.adapter.releaseSource(source);
        source.remove();
        expect(live()).toBe(0);
        expect(grid.view().gesture).toBeUndefined();
        expect(grid.events.at(-1)?.type).toBe("drop-cancel");
    });

    it("removes every one when the source leaves mid-press, or the root mid-drag", () => {
        const grid = setup(two());
        const source = grid.source({ item: { w: 1, h: 1 } });
        const live = counting();
        pointer(source, 1300, 20);
        expect(live()).toBeGreaterThan(0);
        grid.engine.adapter.releaseSource(source);
        expect(live()).toBe(0);
        const press = pointer(source, 1300, 20);
        press.move(...centre(grid, 5, 0, 1, 1));
        grid.detach();
        expect(live()).toBe(0);
        expect(grid.model.get("layout")).toHaveLength(2);
    });
});

describe("a native drag's offset", () => {
    it("places the item away from the pointer by the answer's `dragOffset`, as a source's", () => {
        const grid = setup({
            ...two(),
            // nothing lifts it: the row it lands on shows the offset
            compactor: noCompactor,
            engine: {
                onExternalDrag: () => ({
                    w: 2,
                    h: 1,
                    dragOffset: { x: 0, y: 60 },
                }),
            },
        });
        // the pointer a row above where the item goes
        const [x, y] = centre(grid, 6, 1, 2, 1);
        nativeDrag(grid.root, "dragenter", x, y - 60);
        flush();
        expect(grid.view().gesture?.placeholder).toEqual(
            itemPixels(grid.view().geometry ?? ({} as never), {
                x: 6,
                y: 1,
                w: 2,
                h: 1,
            }),
        );
        nativeDrag(grid.root, "dragleave", 1300, 20);
    });
});
