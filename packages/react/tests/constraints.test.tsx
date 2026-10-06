import {
    aspectRatio,
    gridBounds,
    type Layout,
    minMaxSize,
    snapToGrid,
} from "@fragiola/grid-layout";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GridLayout, type RootProps } from "../src";
import { cell, GEOMETRY, pointer, stubBrowser } from "./helpers";

// Root's constraints, registry and scale (K1–K3, K5), and the cells part (K6).

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 1, h: 1 },
    { id: "b", x: 4, y: 0, w: 2, h: 1 },
];

function Grid(props: Partial<RootProps>) {
    return (
        <GridLayout.Root {...GEOMETRY} defaultLayout={layout} {...props}>
            <GridLayout.Items>
                {(item) => (
                    <GridLayout.Item itemId={item.id}>
                        <GridLayout.ResizeHandle side="bottom-end" />
                    </GridLayout.Item>
                )}
            </GridLayout.Items>
            {props.children}
        </GridLayout.Root>
    );
}

const itemEl = (container: HTMLElement, id: string) =>
    container.querySelector(`[data-item-id="${id}"]`) as HTMLElement;

describe("Root's constraints", () => {
    it("shape a pointer drag, its preview and its commit alike", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const { container } = render(
            <Grid
                constraints={[gridBounds, minMaxSize, snapToGrid(3)]}
                onLayoutChange={onLayoutChange}
            >
                <GridLayout.Placeholder />
            </Grid>,
        );
        const press = pointer(itemEl(container, "a"), ...cell(0, 0));
        press.move(...cell(2, 0));
        const placeholder = container.querySelector(
            '[data-grid-layout-part="placeholder"]',
        ) as HTMLElement;
        // the preview snapped to column 3: 10 px of padding and three columns of 99.17 px
        expect(placeholder.style.transform).toBe("translate(308px, 10px)");
        press.release(...cell(2, 0));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        expect(
            committed.find((item: { id: string }) => item.id === "a"),
        ).toMatchObject({
            x: 3,
        });
    });

    it("resolve an item's own constraints from the registry", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const { container } = render(
            <Grid
                defaultLayout={[
                    {
                        id: "v",
                        x: 0,
                        y: 0,
                        w: 2,
                        h: 1,
                        constraints: [{ name: "aspectRatio", args: [1] }],
                    },
                ]}
                constraintRegistry={{ aspectRatio }}
                onLayoutChange={onLayoutChange}
            />,
        );
        const handle = container.querySelector(
            '[data-grid-layout-part="resize-handle"]',
        ) as HTMLElement;
        const press = pointer(handle, ...cell(1, 0));
        press.move(...cell(3, 0));
        press.release(...cell(3, 0));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        // 4 columns of 89.17 px and 3 gaps: 386.7 px wide; square: (386.7 + 10) / 60, 7 rows
        expect(committed[0]).toMatchObject({ w: 4, h: 7 });
    });

    it("configure the grid again when they change, and keep a controlled layout's stored constraints", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const controlled: Layout = [
            { id: "a", x: 0, y: 0, w: 1, h: 1, constraints: ["snap"] },
        ];
        const registry = { snap: snapToGrid(2) };
        const { rerender, container } = render(
            <Grid
                layout={controlled}
                constraintRegistry={registry}
                onLayoutChange={onLayoutChange}
            />,
        );
        // an equal layout with new constraint objects is the same layout
        rerender(
            <Grid
                layout={[{ ...controlled[0], constraints: ["snap"] } as never]}
                constraintRegistry={registry}
                onLayoutChange={onLayoutChange}
            />,
        );
        expect(onLayoutChange).not.toHaveBeenCalled();
        rerender(
            <Grid
                layout={controlled}
                constraints={[snapToGrid(4)]}
                constraintRegistry={registry}
                onLayoutChange={onLayoutChange}
            />,
        );
        const press = pointer(itemEl(container, "a"), ...cell(0, 0));
        press.move(...cell(3, 0));
        press.release(...cell(3, 0));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        // the grid's snap to 4, then the item's own to 2
        expect(committed[0]).toMatchObject({ x: 4 });
    });
});

describe("Root's scale", () => {
    it("divides the pointer by a given scale", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const { container } = render(
            <Grid scale={0.5} onLayoutChange={onLayoutChange} />,
        );
        const half = (at: [number, number]): [number, number] => [
            at[0] / 2,
            at[1] / 2,
        ];
        const press = pointer(itemEl(container, "a"), ...half(cell(0, 0)));
        press.move(...half(cell(2, 1)));
        press.release(...half(cell(2, 1)));
        const [committed] = onLayoutChange.mock.calls.at(-1) ?? [];
        expect(committed[0]).toMatchObject({ id: "a", x: 2, y: 0 });
    });
});

describe("GridLayout.Cells", () => {
    it.each(["ltr", "rtl"] as const)(
        "renders cols × rows cells, each where a 1 × 1 item there sits (%s)",
        (dir) => {
            stubBrowser();
            const { container } = render(
                <Grid
                    dir={dir}
                    defaultLayout={[{ id: "one", x: 3, y: 1, w: 1, h: 1 }]}
                    allowOverlap
                >
                    <GridLayout.Cells
                        rows={2}
                        className="dot"
                        style={{ background: "red", position: "static" }}
                    >
                        {(state) => (state.x === 3 ? <i /> : null)}
                    </GridLayout.Cells>
                </Grid>,
            );
            const cells = [
                ...container.querySelectorAll<HTMLElement>(
                    '[data-grid-layout-part="cell"]',
                ),
            ];
            expect(cells).toHaveLength(24);
            const at = cells.find(
                (element) =>
                    element.dataset.x === "3" && element.dataset.y === "1",
            ) as HTMLElement;
            const item = itemEl(container, "one");
            expect(at.style.transform).toBe(item.style.transform);
            expect(at.style.width).toBe(item.style.width);
            expect(at.style.height).toBe(item.style.height);
            // the app's look under the structural style
            expect(at.className).toBe("dot");
            expect(at.style.background).toBe("red");
            expect(at.style.position).toBe("absolute");
            expect(container.querySelectorAll("i")).toHaveLength(2);
        },
    );

    it("grows with the layout under `auto`, the preview's during a gesture", () => {
        stubBrowser();
        const { container } = render(
            <Grid>
                <GridLayout.Cells />
            </Grid>,
        );
        const count = () =>
            container.querySelectorAll('[data-grid-layout-part="cell"]').length;
        expect(count()).toBe(24);
        const press = pointer(itemEl(container, "a"), ...cell(0, 0));
        press.move(...cell(7, 0));
        expect(count()).toBe(24);
        press.release(...cell(7, 0));
    });
});
