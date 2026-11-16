import {
    aspectRatio,
    gridBounds,
    type Layout,
    minMaxSize,
    snapToGrid,
} from "@fragiola/grid-layout";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { GridLayout } from "../src";
import {
    cell,
    GEOMETRY,
    mountInDocument,
    pointer,
    stubBrowser,
} from "./helpers";

// Root's constraints, registry and scale (K1–K3, K5), and the cells part (K6).

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 1, h: 1 },
    { id: "b", x: 4, y: 0, w: 2, h: 1 },
];

/** A grid of `layout` (unless given another) and `extra` inside its root, after the items. */
function grid(props: Record<string, unknown>, extra?: () => VNodeChild) {
    return defineComponent({
        setup: () => () =>
            h(
                GridLayout.Root,
                { ...GEOMETRY, defaultLayout: layout, ...props },
                {
                    default: () => [
                        h(GridLayout.Items, null, {
                            default: ({ item }: { item: { id: string } }) =>
                                h(
                                    GridLayout.Item,
                                    { itemId: item.id },
                                    {
                                        default: () =>
                                            h(GridLayout.ResizeHandle, {
                                                side: "bottom-end",
                                            }),
                                    },
                                ),
                        }),
                        extra?.(),
                    ],
                },
            ),
    });
}

const itemEl = (id: string) =>
    document.querySelector(`[data-item-id="${id}"]`) as HTMLElement;

describe("Root's constraints", () => {
    it("shape a pointer drag, its preview and its commit alike", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        mountInDocument(
            grid(
                {
                    constraints: [gridBounds, minMaxSize, snapToGrid(3)],
                    onLayoutChange,
                },
                () => h(GridLayout.Placeholder),
            ),
        );
        const press = await pointer(itemEl("a"), ...cell(0, 0));
        await press.move(...cell(2, 0));
        const placeholder = document.querySelector(
            '[data-grid-layout-part="placeholder"]',
        ) as HTMLElement;
        // the preview snapped to column 3: 10 px of padding and three columns of 99.17 px
        expect(placeholder.style.transform).toBe("translate(308px, 10px)");
        await press.release(...cell(2, 0));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        expect(
            committed.find((item: { id: string }) => item.id === "a"),
        ).toMatchObject({
            x: 3,
        });
    });

    it("resolve an item's own constraints from the registry", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        mountInDocument(
            grid({
                defaultLayout: [
                    {
                        id: "v",
                        x: 0,
                        y: 0,
                        w: 2,
                        h: 1,
                        constraints: [{ name: "aspectRatio", args: [1] }],
                    },
                ],
                constraintRegistry: { aspectRatio },
                onLayoutChange,
            }),
        );
        const handle = document.querySelector(
            '[data-grid-layout-part="resize-handle"]',
        ) as HTMLElement;
        const press = await pointer(handle, ...cell(1, 0));
        await press.move(...cell(3, 0));
        await press.release(...cell(3, 0));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        expect(committed[0]).toMatchObject({ w: 4, h: 7 });
    });

    it("divides the pointer by a given scale", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        mountInDocument(grid({ scale: 0.5, onLayoutChange }));
        const half = (at: [number, number]): [number, number] => [
            at[0] / 2,
            at[1] / 2,
        ];
        const press = await pointer(itemEl("a"), ...half(cell(0, 0)));
        await press.move(...half(cell(2, 1)));
        await press.release(...half(cell(2, 1)));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        expect(committed[0]).toMatchObject({ id: "a", x: 2, y: 0 });
    });
});

describe("GridLayout.Cells", () => {
    it.each(["ltr", "rtl"] as const)(
        "renders cols × rows cells, each where a 1 × 1 item there sits (%s)",
        (dir) => {
            stubBrowser();
            mountInDocument(
                grid(
                    {
                        dir,
                        defaultLayout: [{ id: "one", x: 3, y: 1, w: 1, h: 1 }],
                        allowOverlap: true,
                    },
                    () =>
                        h(
                            GridLayout.Cells,
                            {
                                rows: 2,
                                class: "dot",
                                style: {
                                    background: "red",
                                    position: "static",
                                },
                            },
                            {
                                default: ({
                                    cell: state,
                                }: {
                                    cell: { x: number };
                                }) => (state.x === 3 ? h("i") : null),
                            },
                        ),
                ),
            );
            const cells = [
                ...document.querySelectorAll<HTMLElement>(
                    '[data-grid-layout-part="cell"]',
                ),
            ];
            expect(cells).toHaveLength(24);
            const at = cells.find(
                (element) =>
                    element.dataset.x === "3" && element.dataset.y === "1",
            ) as HTMLElement;
            const item = itemEl("one");
            expect(at.style.transform).toBe(item.style.transform);
            expect(at.style.width).toBe(item.style.width);
            expect(at.style.height).toBe(item.style.height);
            // the app's look under the structural style
            expect(at.className).toBe("dot");
            expect(at.style.background).toBe("red");
            expect(at.style.position).toBe("absolute");
            expect(document.querySelectorAll("i")).toHaveLength(2);
        },
    );

    it("grows with the layout under `auto`, the preview's during a gesture", async () => {
        stubBrowser();
        mountInDocument(grid({}, () => h(GridLayout.Cells)));
        const count = () =>
            document.querySelectorAll('[data-grid-layout-part="cell"]').length;
        expect(count()).toBe(24);
        const press = await pointer(itemEl("a"), ...cell(0, 0));
        await press.move(...cell(7, 0));
        expect(count()).toBe(24);
        await press.release(...cell(7, 0));
    });
});
