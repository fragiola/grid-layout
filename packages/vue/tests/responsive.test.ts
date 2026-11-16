import type { BreakpointInfo, Layout } from "@fragiola/grid-layout";
import { describe, expect, it, vi } from "vitest";
import { type ComputedRef, defineComponent, h, nextTick, ref } from "vue";
import { createGridLayoutRef, GridLayout, useBreakpoint } from "../src";
import { mountInDocument } from "./helpers";

// Responsive grids in Vue (R1–R4): the breakpoint from the grid's width (here the `width`
// prop), controlled or not, layouts per breakpoint, controlled or not, and what is told.

const BREAKPOINTS = { lg: 996, sm: 0 };
const COLS = { lg: 12, sm: 6 };
const LG: Layout = [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 8, h: 2 },
];

let seen: ComputedRef<BreakpointInfo> | undefined;
const Seen = defineComponent({
    setup() {
        seen = useBreakpoint();
        return () => null;
    },
});

const Grid = defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
        return () =>
            h(
                GridLayout.Root,
                {
                    breakpoints: BREAKPOINTS,
                    cols: COLS,
                    rowHeight: 50,
                    gap: [10, 10],
                    width: 1200,
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
                        h(Seen),
                    ],
                },
            );
    },
});

const testId = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`) as HTMLElement;

describe("a responsive root", () => {
    it("takes the breakpoint the width gives, tells it once, and the generated layout with every layout", async () => {
        const onBreakpointChange = vi.fn();
        const onLayoutChange = vi.fn();
        const onLayouts = vi.fn();
        const wrapper = mountInDocument(Grid, {
            defaultLayouts: { lg: LG },
            onBreakpointChange,
            onLayoutChange,
            "onUpdate:layouts": onLayouts,
        });
        const grid = testId("grid");
        expect(grid.getAttribute("data-breakpoint")).toBe("lg");
        expect(seen?.value).toEqual({
            breakpoint: "lg",
            cols: 12,
            width: 1200,
        });
        expect(onLayoutChange).not.toHaveBeenCalled();
        await wrapper.setProps({ width: 800 });
        await nextTick();
        expect(grid.getAttribute("data-breakpoint")).toBe("sm");
        expect(seen?.value).toEqual({ breakpoint: "sm", cols: 6, width: 800 });
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith("sm", 6);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const [layout, layouts] = onLayoutChange.mock.calls[0] ?? [];
        expect(layout).toEqual([
            { id: "a", x: 0, y: 0, w: 4, h: 2 },
            { id: "b", x: 0, y: 2, w: 6, h: 2 },
        ]);
        expect(Object.keys(layouts).sort()).toEqual(["lg", "sm"]);
        expect(onLayouts).toHaveBeenCalledWith(layouts);
    });

    it("lets a controlled breakpoint override the width", () => {
        mountInDocument(Grid, { defaultLayouts: { lg: LG }, breakpoint: "sm" });
        expect(testId("grid").getAttribute("data-breakpoint")).toBe("sm");
    });

    it("places items with the breakpoint's own row height", async () => {
        const wrapper = mountInDocument(Grid, {
            defaultLayouts: { lg: LG },
            rowHeight: { lg: 50, sm: 20 },
        });
        expect(testId("item-a").style.height).toBe("110px");
        await wrapper.setProps({ width: 800 });
        await nextTick();
        expect(testId("item-a").style.height).toBe("50px");
    });

    it("keeps v-model:layouts, and never loops with a parent that ignores them", async () => {
        const told = vi.fn();
        const width = ref(1200);
        mountInDocument(
            defineComponent({
                setup() {
                    const layouts = ref<Record<string, Layout>>({ lg: LG });
                    return () =>
                        h(Grid, {
                            width: width.value,
                            layouts: layouts.value,
                            "onUpdate:layouts": (
                                all: Record<string, Layout>,
                            ) => {
                                told();
                                layouts.value = { ...all };
                            },
                        });
                },
            }),
        );
        width.value = 800;
        await nextTick();
        await nextTick();
        expect(told).toHaveBeenCalledTimes(1);
        expect(testId("item-b").style.width).not.toBe("");
    });

    it("takes layouts written anew at every render, with no update loop (react-grid-layout#2202)", async () => {
        const told = vi.fn();
        const width = ref(1200);
        const renders = ref(0);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(Grid, {
                        width: width.value,
                        // a new object at every render, as the report's inline `layouts`
                        layouts: { lg: LG },
                        "data-renders": renders.value,
                        onLayoutChange: () => {
                            told();
                            renders.value++;
                        },
                    }),
            }),
        );
        expect(told).not.toHaveBeenCalled();
        width.value = 800;
        await nextTick();
        await nextTick();
        await nextTick();
        expect(told).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("tells no layout change on mount for a breakpoint alone, and the breakpoint the first measure gives", () => {
        const onLayoutChange = vi.fn();
        const onBreakpointChange = vi.fn();
        mountInDocument(Grid, {
            width: 600,
            defaultLayouts: {
                lg: LG,
                sm: [
                    { id: "a", x: 0, y: 0, w: 4, h: 2 },
                    { id: "b", x: 0, y: 2, w: 6, h: 2 },
                ],
            },
            onLayoutChange,
            onBreakpointChange,
        });
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith("sm", 6);
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("configures nothing again for maps written anew, and throws on unusable ones", async () => {
        const gridLayoutRef = createGridLayoutRef();
        const wrapper = mountInDocument(Grid, {
            gridLayoutRef,
            defaultLayouts: { lg: LG },
        });
        let configured = 0;
        gridLayoutRef.current?.model.use((ctx, next) => {
            if (ctx.command === "grid.configure") configured++;
            return next();
        });
        await wrapper.setProps({
            breakpoints: { ...BREAKPOINTS },
            cols: { ...COLS },
        });
        expect(configured).toBe(0);
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(() =>
            mountInDocument(Grid, { layouts: { lg: LG, tablet: LG } }),
        ).toThrow(/no breakpoint "tablet"/);
        expect(() => mountInDocument(Grid, { cols: { lg: 12 } })).toThrow(
            /cols/,
        );
        spy.mockRestore();
    });

    it("tells the breakpoint from outside the root, through its ref", async () => {
        const gridLayoutRef = createGridLayoutRef();
        let outside: ComputedRef<BreakpointInfo | undefined> | undefined;
        const Outside = defineComponent({
            setup() {
                outside = useBreakpoint(gridLayoutRef);
                return () => null;
            },
        });
        mountInDocument(
            defineComponent({
                setup: () => () => [
                    h(Outside),
                    h(Grid, { defaultLayouts: { lg: LG }, gridLayoutRef }),
                ],
            }),
        );
        await nextTick();
        expect(outside?.value).toEqual({
            breakpoint: "lg",
            cols: 12,
            width: 1200,
        });
    });

    it("leaves a grid without breakpoints as it was", () => {
        const onBreakpointChange = vi.fn();
        mountInDocument(GridLayout.Root, {
            width: 600,
            defaultLayout: LG,
            onBreakpointChange,
            "data-testid": "plain",
        });
        expect(testId("plain").getAttribute("data-breakpoint")).toBe("default");
        expect(onBreakpointChange).not.toHaveBeenCalled();
    });
});
