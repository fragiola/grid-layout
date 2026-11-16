import type { GridLayoutModel, Layout } from "@fragiola/grid-layout";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, isProxy, nextTick, ref } from "vue";
import {
    GridLayout,
    type GridLayoutContextValue,
    useGridLayout,
    veto,
} from "../src";
import { Grid } from "./grid";
import {
    box,
    cell,
    GEOMETRY,
    key,
    maybeBox,
    mountInDocument,
    pointer,
    stubBrowser,
} from "./helpers";

const two: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

describe("GridLayout.Root", () => {
    it("renders the items at their boxes, the root as tall as the layout", () => {
        mountInDocument(Grid, { defaultLayout: two });
        // column 2 starts at 10 + 2 × 99.17, rounded
        expect(box("b").style.transform).toBe("translate(208px, 10px)");
        expect(box("dashboard").style.height).toBe("130px");
        expect(box("a").getAttribute("data-grid-layout-part")).toBe("item");
        expect(box("a").getAttribute("data-item-id")).toBe("a");
        expect(box("a").tabIndex).toBe(0);
    });

    it("uncontrolled: a drop stands, and update:layout is told once (react-grid-layout#1984)", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const onUpdate = vi.fn();
        mountInDocument(Grid, {
            defaultLayout: two,
            onLayoutChange,
            "onUpdate:layout": onUpdate,
        });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(cell(0, 0)[0] + 8, cell(0, 0)[1]);
        await press.move(...cell(2, 0));
        expect(onLayoutChange).not.toHaveBeenCalled();
        await press.release(...cell(2, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 2, y: 0, w: 2, h: 2 },
            { id: "b", x: 2, y: 2, w: 2, h: 2 },
        ]);
    });

    it("controlled: a parent that ignores the change keeps the items where they were", async () => {
        stubBrowser();
        const onUpdate = vi.fn();
        mountInDocument(Grid, { layout: two, "onUpdate:layout": onUpdate });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 0));
        await press.release(...cell(2, 0));
        await nextTick();
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("controlled: v-model:layout renders the change", async () => {
        stubBrowser();
        const Parent = defineComponent({
            setup() {
                const layout = ref<Layout>(two);
                return () =>
                    h(Grid, {
                        layout: layout.value,
                        "onUpdate:layout": (next: Layout) => {
                            layout.value = next;
                        },
                    });
            },
        });
        mountInDocument(Parent);
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 0));
        await press.release(...cell(2, 0));
        await nextTick();
        expect(box("b").style.transform).toBe("translate(208px, 130px)");
    });

    it("controlled: the model keeps no reactive proxy, and tells layouts the parent owns", async () => {
        stubBrowser();
        let told: Layout | undefined;
        let layout: ReturnType<typeof ref<Layout>> | undefined;
        let model: GridLayoutModel | undefined;
        const Probe = defineComponent({
            setup() {
                model = useGridLayout().model;
                return () => null;
            },
        });
        const Parent = defineComponent({
            setup() {
                layout = ref<Layout>(two);
                return () =>
                    h(
                        GridLayout.Root,
                        {
                            cols: 12,
                            rowHeight: 50,
                            width: 1200,
                            layout: layout?.value,
                            "onUpdate:layout": (next: Layout) => {
                                told = next;
                                if (layout) layout.value = next;
                            },
                        },
                        () => h(Probe),
                    );
            },
        });
        mountInDocument(Parent);
        expect(isProxy(model?.get("layout"))).toBe(false);
        model?.run("item.move", { itemId: "a", x: 4, y: 0 });
        await nextTick();
        expect(told).toBeDefined();
        expect(told).not.toBe(model?.get("layout"));
        expect(() => structuredClone(told)).not.toThrow();
        // the parent changing its own layout in place never reaches the committed one
        const first = layout?.value?.[0] as { w: number } | undefined;
        if (first) first.w = 9;
        expect(model?.get("layout").find((item) => item.id === "a")?.w).toBe(2);
    });

    it("tells a corrected layout on mount, and nothing for a valid one", async () => {
        const onLayoutChange = vi.fn();
        const valid = mountInDocument(Grid, {
            defaultLayout: two,
            onLayoutChange,
        });
        expect(onLayoutChange).not.toHaveBeenCalled();
        valid.unmount();
        mountInDocument(Grid, {
            defaultLayout: [{ id: "a", x: 20, y: 5, w: 2, h: 2 }],
            onLayoutChange,
        });
        expect(onLayoutChange).toHaveBeenCalledWith(
            [{ id: "a", x: 10, y: 0, w: 2, h: 2 }],
            { default: expect.any(Array) },
        );
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
    });

    it("renders nothing while a drag stays over one cell (D8)", async () => {
        stubBrowser();
        const onRender = vi.fn();
        mountInDocument(Grid, { defaultLayout: two, onRender });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(cell(0, 0)[0] + 10, cell(0, 0)[1]);
        const renders = onRender.mock.calls.length;
        for (let dx = 12; dx < 40; dx += 4)
            await press.move(cell(0, 0)[0] + dx, cell(0, 0)[1]);
        expect(onRender.mock.calls.length).toBe(renders);
        await press.move(...cell(2, 0));
        expect(onRender.mock.calls.length).toBeGreaterThan(renders);
        await press.release(...cell(2, 0));
    });

    it("shows the placeholder only during a gesture, and the gesture's data on the root", async () => {
        stubBrowser();
        mountInDocument(Grid, { defaultLayout: two });
        expect(maybeBox("placeholder")).toBeNull();
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(1, 1));
        expect(box("placeholder").getAttribute("data-kind")).toBe("move");
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(true);
        expect(box("a").hasAttribute("data-dragging")).toBe(true);
        await press.release(...cell(1, 1));
        expect(maybeBox("placeholder")).toBeNull();
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(false);
    });

    it("calls the gesture callbacks, as listeners", async () => {
        stubBrowser();
        const onDragStart = vi.fn();
        const onDragStop = vi.fn();
        mountInDocument(Grid, { defaultLayout: two, onDragStart, onDragStop });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(1, 0));
        await press.release(...cell(1, 0));
        expect(onDragStart).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag-start", itemId: "a" }),
        );
        expect(onDragStop).toHaveBeenCalledTimes(1);
    });

    it("lets the app veto a press with preventDefault, its listener first", async () => {
        stubBrowser();
        const onDragStart = vi.fn();
        mountInDocument(Grid, {
            defaultLayout: two,
            onDragStart,
            onPointerdown: (event: PointerEvent) => event.preventDefault(),
        });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 1));
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("grabs and drops with the keyboard", async () => {
        const onLayoutChange = vi.fn();
        mountInDocument(Grid, { defaultLayout: two, onLayoutChange });
        await key(box("b"), " ");
        expect(box("b").hasAttribute("data-grabbed")).toBe(true);
        await key(box("b"), "ArrowLeft");
        await key(box("b"), "ArrowLeft");
        await key(box("b"), "Enter");
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
    });

    it("lets the model's commands move the rendered items, and middleware refuse them", async () => {
        let api: GridLayoutContextValue | undefined;
        const Grab = defineComponent({
            setup() {
                api = useGridLayout();
                return () => null;
            },
        });
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(
                        GridLayout.Root,
                        { ...GEOMETRY, defaultLayout: two },
                        {
                            default: () => [
                                h(Grab),
                                h(GridLayout.Items, null, {
                                    default: ({
                                        item,
                                    }: {
                                        item: { id: string };
                                    }) =>
                                        h(GridLayout.Item, {
                                            itemId: item.id,
                                            "aria-label": item.id,
                                        }),
                                }),
                            ],
                        },
                    ),
            }),
        );
        api?.model.run("item.move", { itemId: "b", x: 0, y: 0 });
        await nextTick();
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
        api?.model.use(() => veto());
        api?.model.run("item.move", { itemId: "b", x: 4, y: 0 });
        await nextTick();
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
    });

    it("re-settles when a rule changes, and tells it", async () => {
        const onLayoutChange = vi.fn();
        const wrapper = mountInDocument(Grid, {
            defaultLayout: two,
            onLayoutChange,
        });
        await wrapper.setProps({ cols: 2 });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
            { id: "b", x: 0, y: 2, w: 2, h: 2 },
        ]);
    });

    it("tells nothing when only a rule changes and no item moves, and a map written again configures nothing", async () => {
        const onLayoutChange = vi.fn();
        const wrapper = mountInDocument(Grid, {
            defaultLayout: two,
            onLayoutChange,
            cols: { default: 12 },
        });
        await wrapper.setProps({ preventCollision: true });
        await wrapper.setProps({ cols: { default: 12 } });
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("sets dir on the root and mirrors in right-to-left", () => {
        mountInDocument(Grid, {
            defaultLayout: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
            dir: "rtl",
        });
        expect(box("dashboard").getAttribute("dir")).toBe("rtl");
        // 1200 − 10 − the item's 188px width
        expect(box("a").style.transform).toBe("translate(1002px, 10px)");
    });

    it("hides a resize handle while its item cannot be resized", () => {
        mountInDocument(Grid, {
            defaultLayout: [
                { id: "a", x: 0, y: 0, w: 2, h: 2, static: true },
                two[1],
            ],
        });
        expect(maybeBox("resize a")).toBeNull();
        expect(box("resize b").getAttribute("data-side")).toBe("bottom-end");
    });

    it("moves the tab stop to a drag handle, once it is mounted", async () => {
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(
                        GridLayout.Root,
                        { ...GEOMETRY, defaultLayout: two },
                        {
                            default: () =>
                                h(GridLayout.Items, null, {
                                    default: ({
                                        item,
                                    }: {
                                        item: { id: string };
                                    }) =>
                                        h(
                                            GridLayout.Item,
                                            {
                                                itemId: item.id,
                                                "aria-label": item.id,
                                            },
                                            {
                                                default: () =>
                                                    item.id === "a"
                                                        ? h(
                                                              GridLayout.DragHandle,
                                                              {
                                                                  "aria-label":
                                                                      "grip",
                                                              },
                                                          )
                                                        : null,
                                            },
                                        ),
                                }),
                        },
                    ),
            }),
        );
        // the handle registers as it mounts: the item gives up its tab stop at the next patch
        await nextTick();
        expect(box("a").tabIndex).toBe(-1);
        expect(box("grip").tabIndex).toBe(0);
        expect(box("b").tabIndex).toBe(0);
    });

    it("applies a controlled layout that must be corrected once, and tells it once", async () => {
        const onUpdate = vi.fn();
        const messy: Layout = [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const wrapper = mountInDocument(Grid, {
            layout: messy,
            "onUpdate:layout": onUpdate,
        });
        await wrapper.setProps({ cols: 12 });
        await wrapper.setProps({ cols: 12, "aria-busy": "false" });
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
        ]);
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("tells a new prop that has to be corrected, even when the grid already shows it", async () => {
        const onLayoutChange = vi.fn();
        const messy = (): Layout => [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const wrapper = mountInDocument(Grid, {
            layout: messy(),
            onLayoutChange,
        });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        await wrapper.setProps({ layout: messy() });
        expect(onLayoutChange).toHaveBeenCalledTimes(2);
        expect(onLayoutChange).toHaveBeenLastCalledWith(
            [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
            { default: expect.any(Array) },
        );
    });

    it("throws the same error for an invalid layout as React's", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const bad = [{ id: "a", x: 0, y: 0, w: 0, h: 1 }] as Layout;
        expect(() => mountInDocument(Grid, { layout: bad })).toThrow(
            /invalid layout/,
        );
        warn.mockRestore();
    });

    it("moves with the visual arrows in right-to-left", async () => {
        const onLayoutChange = vi.fn();
        mountInDocument(Grid, {
            defaultLayout: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
            dir: "rtl",
            onLayoutChange,
        });
        await key(box("a"), " ");
        // in right-to-left, ArrowLeft moves toward the inline end: one column further
        await key(box("a"), "ArrowLeft");
        await key(box("a"), "Enter");
        expect(onLayoutChange.mock.calls.at(-1)?.[0][0]).toMatchObject({
            x: 1,
        });
    });

    it("goes back to a rule's default when its prop is removed", async () => {
        let api: GridLayoutContextValue | undefined;
        const Grab = defineComponent({
            setup() {
                api = useGridLayout();
                return () => null;
            },
        });
        const extra = ref<Record<string, unknown>>({
            cols: 3,
            allowOverlap: true,
        });
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(
                        GridLayout.Root,
                        { ...GEOMETRY, defaultLayout: two, ...extra.value },
                        { default: () => h(Grab) },
                    ),
            }),
        );
        expect(api?.model.state).toMatchObject({ cols: 3, allowOverlap: true });
        extra.value = {};
        await nextTick();
        expect(api?.model.state).toMatchObject({
            cols: 12,
            allowOverlap: false,
        });
    });

    it("throws a clear error for a part outside a root or an item", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(() => mountInDocument(GridLayout.Item, { itemId: "a" })).toThrow(
            /inside a GridLayout.Root/,
        );
        expect(() =>
            mountInDocument(
                defineComponent({
                    setup: () => () =>
                        h(
                            GridLayout.Root,
                            { ...GEOMETRY },
                            { default: () => h(GridLayout.DragHandle) },
                        ),
                }),
            ),
        ).toThrow(/inside a GridLayout.Item/);
        spy.mockRestore();
    });
});
