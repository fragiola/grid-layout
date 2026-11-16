// @vitest-environment node
import type { Layout } from "@fragiola/grid-layout";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createGridLayoutRef, GridLayout } from "../src";

const layout: Layout = [{ id: "a", x: 1, y: 0, w: 2, h: 1 }];

const Grid = defineComponent({
    props: { width: { type: Number, default: undefined } },
    setup(props) {
        return () =>
            h(
                GridLayout.Root,
                {
                    rowHeight: 50,
                    gap: [10, 10],
                    defaultLayout: layout,
                    width: props.width,
                },
                {
                    default: () => [
                        h(GridLayout.Items, null, {
                            default: ({ item }: { item: { id: string } }) =>
                                h(
                                    GridLayout.Item,
                                    { itemId: item.id },
                                    { default: () => item.id },
                                ),
                        }),
                        h(GridLayout.Placeholder),
                    ],
                },
            );
    },
});

const html = (render: () => ReturnType<typeof h> | ReturnType<typeof h>[]) =>
    renderToString(createSSRApp(defineComponent({ setup: () => render })));

describe("server rendering", () => {
    it("renders the root without a document, and the items once a width is known", async () => {
        const out = await html(() => h(Grid));
        expect(out).toContain('data-grid-layout-part="root"');
        // items mount already placed, on the client once the root is measured
        expect(out).not.toContain('data-grid-layout-part="item"');
    });

    it("places items when given a width", async () => {
        const out = await html(() => h(Grid, { width: 1200 }));
        expect(out).toContain("translate(109px, 10px)");
    });

    it("renders a drag source outside a root, and no drag preview", async () => {
        const gridLayoutRef = createGridLayoutRef();
        const out = await html(() => [
            h(GridLayout.DragSource, { gridLayoutRef, item: { w: 1, h: 1 } }),
            h(GridLayout.DragPreview, { gridLayoutRef }),
            h(Grid, { width: 1200 }),
        ]);
        expect(out).toContain('data-grid-layout-part="drag-source"');
        expect(out).toContain('tabindex="0"');
        expect(out).not.toContain("drag-preview");
    });

    it("renders a responsive root at its default breakpoint, without a width", async () => {
        const out = await html(() =>
            h(GridLayout.Root, {
                breakpoints: { lg: 996, sm: 0 },
                cols: { lg: 12, sm: 6 },
                defaultBreakpoint: "sm",
                defaultLayouts: { sm: layout },
            }),
        );
        expect(out).toContain('data-breakpoint="sm"');
    });
});
