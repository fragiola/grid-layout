import type { Layout } from "@fragiola/grid-layout";
import { describe, expect, it, vi } from "vitest";
import {
    type ComputedRef,
    defineComponent,
    h,
    nextTick,
    type PropType,
    ref,
} from "vue";
import {
    createGridLayoutRef,
    type DropDetails,
    GridLayout,
    type GridLayoutContextValue,
    type GridLayoutRef,
    useGridLayout,
} from "../src";
import {
    cell,
    GEOMETRY,
    key,
    mountInDocument,
    pointer,
    stubBrowser,
} from "./helpers";

// Drops from outside the grid in Vue (X1, X5, X6): the ref, a drag source and a drag preview
// outside the root, the keyboard drop, native drags, and the root's drop attributes.

const two: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

/** The viewport point at the centre of a 2 × 1 box at cell (x, y). */
const centre = (x: number, y: number): [number, number] => {
    const [left, top] = cell(x, y);
    return [left - 5 + 1190 / 12 - 5, top - 5 + 25];
};

const byTestId = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const testId = (id: string) => {
    const found = byTestId(id);
    if (!found) throw new Error(`no ${id}`);
    return found;
};

/** What the grid inside the root says it is, for comparing with the ref's. */
let inside: GridLayoutContextValue | undefined;
const Inside = defineComponent({
    setup() {
        inside = useGridLayout();
        return () => null;
    },
});

const Board = defineComponent({
    inheritAttrs: false,
    props: {
        gridLayoutRef: {
            type: Object as PropType<GridLayoutRef>,
            required: true,
        },
        onSourceDrop: {
            type: Function as PropType<(drop: DropDetails) => void>,
            default: undefined,
        },
        disabled: { type: Boolean, default: undefined },
        showSource: { type: Boolean, default: true },
    },
    setup(props, { attrs }) {
        return () => [
            h("aside", [
                props.showSource
                    ? h(GridLayout.DragSource, {
                          gridLayoutRef: props.gridLayoutRef,
                          item: { w: 2, h: 1 },
                          data: { kind: "note" },
                          disabled: props.disabled,
                          onDrop: props.onSourceDrop,
                          "data-testid": "source",
                      })
                    : null,
                h(
                    GridLayout.DragPreview,
                    {
                        gridLayoutRef: props.gridLayoutRef,
                        "data-testid": "preview",
                    },
                    {
                        default: ({ state }: { state: { data: unknown } }) =>
                            (state.data as { kind: string }).kind,
                    },
                ),
            ]),
            h(
                GridLayout.Root,
                {
                    ...GEOMETRY,
                    defaultLayout: two,
                    gridLayoutRef: props.gridLayoutRef,
                    "data-testid": "grid",
                    ...attrs,
                },
                {
                    default: () => [
                        h(GridLayout.Items, null, {
                            default: ({ item }: { item: { id: string } }) =>
                                h(GridLayout.Item, {
                                    itemId: item.id,
                                    "data-testid": `item-${item.id}`,
                                }),
                        }),
                        h(GridLayout.Placeholder, {
                            "data-testid": "placeholder",
                        }),
                        h(Inside),
                    ],
                },
            ),
        ];
    },
});

describe("gridLayoutRef", () => {
    it("is null before a root holds it, the root's grid while it does, null after", () => {
        const gridLayoutRef = createGridLayoutRef();
        expect(gridLayoutRef.current).toBeNull();
        const wrapper = mountInDocument(Board, { gridLayoutRef });
        expect(gridLayoutRef.current).not.toBeNull();
        expect(gridLayoutRef.current?.model).toBe(inside?.model);
        expect(gridLayoutRef.current?.engine).toBe(inside?.engine);
        wrapper.unmount();
        expect(gridLayoutRef.current).toBeNull();
    });

    it("runs a command that changes the rendered grid", async () => {
        const gridLayoutRef = createGridLayoutRef();
        mountInDocument(Board, { gridLayoutRef });
        gridLayoutRef.current?.model.run("item.add", {
            item: { id: "c", x: 4, y: 0, w: 1, h: 1 },
        });
        await nextTick();
        expect(byTestId("item-c")).toBeTruthy();
    });

    it("is held already when a mount callback runs", () => {
        const gridLayoutRef = createGridLayoutRef();
        let held: unknown = "not called";
        mountInDocument(GridLayout.Root, {
            ...GEOMETRY,
            gridLayoutRef,
            // overlapping: corrected on mount, and told
            defaultLayout: [...two, { id: "c", x: 0, y: 0, w: 1, h: 1 }],
            onLayoutChange: () => {
                held = gridLayoutRef.current;
            },
        });
        expect(held).toBe(gridLayoutRef.current);
        expect(held).not.toBeNull();
    });

    it("follows the grid from outside, for a composable given the ref", async () => {
        const gridLayoutRef = createGridLayoutRef();
        let outside: ComputedRef<GridLayoutContextValue | null> | undefined;
        const Outside = defineComponent({
            setup() {
                outside = useGridLayout(gridLayoutRef);
                return () => null;
            },
        });
        mountInDocument(
            defineComponent({
                setup: () => () => [h(Outside), h(Board, { gridLayoutRef })],
            }),
        );
        await nextTick();
        expect(outside?.value).toBe(gridLayoutRef.current);
        expect(outside?.value?.model).toBe(inside?.model);
    });
});

describe("GridLayout.DragSource", () => {
    it("drops a new item from outside the root, told to the root and the source", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDrop = vi.fn();
        const onSourceDrop = vi.fn();
        const onLayoutChange = vi.fn();
        mountInDocument(Board, {
            gridLayoutRef,
            onDrop,
            onSourceDrop,
            onLayoutChange,
        });
        await nextTick();
        expect(byTestId("preview")).toBeNull();
        const source = testId("source");
        const press = await pointer(source, 1300, 500);
        await press.move(...centre(4, 0));
        const grid = testId("grid");
        expect(grid.hasAttribute("data-dropping")).toBe(true);
        expect(source.hasAttribute("data-dragging")).toBe(true);
        expect(testId("placeholder").getAttribute("data-kind")).toBe("drop");
        const preview = testId("preview");
        expect(preview.textContent).toBe("note");
        expect(preview.style.position).toBe("fixed");
        expect(preview.style.transform).toContain("translate(");
        expect(onLayoutChange).not.toHaveBeenCalled();
        await press.release(...centre(4, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const told = {
            item: expect.objectContaining({ x: 4, y: 0, w: 2, h: 1 }),
            data: { kind: "note" },
            layout: expect.any(Array),
        };
        expect(onDrop).toHaveBeenCalledWith(told);
        expect(onSourceDrop).toHaveBeenCalledWith(told);
        expect(byTestId("preview")).toBeNull();
        expect(grid.hasAttribute("data-dropping")).toBe(false);
        const id = onDrop.mock.calls[0]?.[0].item.id as string;
        expect(byTestId(`item-${id}`)).toBeTruthy();
    });

    it("is a tab stop that grabs from the keyboard, and focuses the item it adds", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        mountInDocument(Board, { gridLayoutRef });
        await nextTick();
        const source = testId("source");
        expect(source.tabIndex).toBe(0);
        source.focus();
        await key(source, "Enter");
        expect(source.hasAttribute("data-grabbed")).toBe(true);
        await key(source, "ArrowDown");
        await key(source, "Enter");
        await nextTick();
        const layout = gridLayoutRef.current?.model.get("layout") ?? [];
        expect(layout).toHaveLength(3);
        const added = layout.find((item) => item.id !== "a" && item.id !== "b");
        expect(document.activeElement).toBe(testId(`item-${added?.id}`));
    });

    it("starts nothing when disabled, and is no tab stop", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        mountInDocument(Board, { gridLayoutRef, disabled: true });
        await nextTick();
        const source = testId("source");
        expect(source.hasAttribute("data-disabled")).toBe(true);
        expect(source.tabIndex).toBe(-1);
        const press = await pointer(source, 1300, 500);
        await press.move(...centre(4, 0));
        expect(testId("grid").hasAttribute("data-dropping")).toBe(false);
        await key(source, "Enter");
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
    });

    it("ends the drop it started when it leaves the page", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const wrapper = mountInDocument(Board, { gridLayoutRef });
        await nextTick();
        const press = await pointer(testId("source"), 1300, 500);
        await press.move(...centre(4, 0));
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeDefined();
        await wrapper.setProps({ showSource: false });
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(2);
    });

    it("works inside the root without a ref", async () => {
        stubBrowser();
        const onDrop = vi.fn();
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(
                        GridLayout.Root,
                        { ...GEOMETRY, defaultLayout: two, onDrop },
                        {
                            default: () =>
                                h(GridLayout.DragSource, {
                                    item: { w: 1, h: 1 },
                                    "data-testid": "inner",
                                }),
                        },
                    ),
            }),
        );
        const press = await pointer(testId("inner"), 600, 20);
        await press.move(...centre(6, 0));
        await press.release(...centre(6, 0));
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("throws a clear error outside a root without a ref", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(() =>
            mountInDocument(GridLayout.DragSource, { item: { w: 1, h: 1 } }),
        ).toThrow(/inside a GridLayout.Root, or take a gridLayoutRef/);
        spy.mockRestore();
    });
});

describe("native drags on the root", () => {
    /** A native drag event (jsdom has no `DragEvent`): a mouse event with a `dataTransfer`. */
    async function drag(
        target: Element,
        type: "dragenter" | "dragleave" | "drop",
        [x, y]: [number, number],
    ) {
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        });
        Object.defineProperty(event, "dataTransfer", {
            value: {
                dropEffect: "none",
                effectAllowed: "all",
                types: ["Files"],
                files: [{ name: "plan.pdf" }],
            },
        });
        target.dispatchEvent(event);
        await nextTick();
    }

    it("marks a refused drag, and drops what it accepts with the drop's data", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDrop = vi.fn();
        let accept = false;
        mountInDocument(Board, {
            gridLayoutRef,
            onDrop,
            onExternalDrag: (event: DragEvent) =>
                accept
                    ? {
                          w: 2,
                          h: 1,
                          data: Array.from(
                              (event.dataTransfer?.files ?? []) as ArrayLike<{
                                  name: string;
                              }>,
                              (file) => file.name,
                          ),
                      }
                    : false,
        });
        const grid = testId("grid");
        await drag(grid, "dragenter", centre(4, 0));
        expect(grid.hasAttribute("data-drop-refused")).toBe(true);
        await drag(grid, "dragleave", centre(4, 0));
        expect(grid.hasAttribute("data-drop-refused")).toBe(false);
        accept = true;
        await drag(grid, "dragenter", centre(4, 0));
        expect(grid.hasAttribute("data-dropping")).toBe(true);
        await drag(grid, "drop", centre(4, 0));
        expect(onDrop).toHaveBeenCalledWith(
            expect.objectContaining({ data: ["plan.pdf"] }),
        );
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(3);
    });
});

describe("React Grid Layout's issues", () => {
    it("tells no layout change and loops no update while a source goes in and out (react-grid-layout#2219, react-grid-layout#2204, react-grid-layout#2210)", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onLayoutChange = vi.fn();
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mountInDocument(Board, { gridLayoutRef, onLayoutChange });
        await nextTick();
        const press = await pointer(testId("source"), 1300, 500);
        for (let pass = 0; pass < 3; pass++) {
            await press.move(...centre(4, 0));
            expect(byTestId("placeholder")).toBeTruthy();
            await press.move(1300, 500);
            expect(byTestId("placeholder")).toBeNull();
        }
        await press.release(1300, 500);
        expect(onLayoutChange).not.toHaveBeenCalled();
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(2);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it("clears the drop and drags again when a controlled parent takes the drop (react-grid-layout#2263)", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        mountInDocument(
            defineComponent({
                setup() {
                    const layout = ref<Layout>(two);
                    const drops = ref(0);
                    return () =>
                        h(Board, {
                            gridLayoutRef,
                            layout: layout.value,
                            "onUpdate:layout": (next: Layout) => {
                                layout.value = next;
                            },
                            // the app's own state, set in the same drop
                            onDrop: () => {
                                drops.value++;
                            },
                            "data-drops": drops.value,
                        });
                },
            }),
        );
        await nextTick();
        const press = await pointer(testId("source"), 1300, 500);
        await press.move(...centre(4, 0));
        await press.release(...centre(4, 0));
        await nextTick();
        expect(byTestId("placeholder")).toBeNull();
        expect(testId("grid").hasAttribute("data-dropping")).toBe(false);
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(3);
        // the next gesture starts as usual
        const again = await pointer(testId("item-a"), ...cell(0, 0));
        await again.move(...cell(8, 0));
        expect(byTestId("placeholder")).toBeTruthy();
        await again.release(...cell(8, 0));
        expect(
            gridLayoutRef.current?.model.get("item-by", { itemId: "a" }),
        ).toMatchObject({ x: 8 });
    });
});

describe("dragging an item off the grid", () => {
    it("marks the root and the item, and tells onDragStop it ended outside", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDragStop = vi.fn();
        mountInDocument(Board, { gridLayoutRef, onDragStop });
        const item = testId("item-a");
        const press = await pointer(item, ...cell(0, 0));
        await press.move(1400, 20);
        expect(testId("grid").hasAttribute("data-outside")).toBe(true);
        expect(item.hasAttribute("data-outside")).toBe(true);
        await press.release(1400, 20);
        expect(onDragStop).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag-stop", outside: true }),
        );
        expect(
            gridLayoutRef.current?.model.get("item-by", { itemId: "a" }),
        ).toMatchObject({ x: 0, y: 0 });
    });
});
