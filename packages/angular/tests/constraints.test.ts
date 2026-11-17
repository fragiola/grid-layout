import { Component, input, type Signal } from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import {
    aspectRatio,
    type CellState,
    type ConstraintRegistry,
    type Direction,
    GRID_LAYOUT,
    gridBounds,
    injectCells,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    type Part,
    snapToGrid,
} from "../src/public-api";
import { cell, pointer, render, stubBrowser } from "./helpers";

// Root's constraints, registry and scale (K1–K3, K5), and the cells part (K6).

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 1, h: 1 },
    { id: "b", x: 4, y: 0, w: 2, h: 1 },
];

interface ConstrainedOptions {
    defaultLayout?: Layout;
    constraints?: readonly LayoutConstraint[];
    constraintRegistry?: ConstraintRegistry;
    scale?: number;
    dir?: Direction;
    allowOverlap?: boolean;
    onLayoutChange?: (layout: Layout) => void;
    /** the parts after the items: a placeholder, cells */
    placeholder?: boolean;
    cells?: number | "auto";
}

let cells: Signal<readonly Part<CellState>[]> | undefined;

@Component({ selector: "test-cells-probe", template: "" })
class CellsProbe {
    constructor() {
        cells = injectCells(2);
    }
}

@Component({
    selector: "test-constrained",
    imports: [GRID_LAYOUT, CellsProbe],
    template: `
        <div
            gridLayoutRoot
            [width]="1200"
            [rowHeight]="50"
            [gap]="gap"
            [defaultLayout]="o().defaultLayout ?? layout"
            [constraints]="o().constraints"
            [constraintRegistry]="o().constraintRegistry"
            [scale]="o().scale"
            [dir]="o().dir"
            [allowOverlap]="o().allowOverlap"
            (layoutChange)="o().onLayoutChange?.($event)"
        >
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id"><div *gridLayoutResizeHandle="'bottom-end'"></div></div>
            </ng-template>
            @if (o().placeholder) {
                <div *gridLayoutPlaceholder></div>
            }
            @if (o().cells !== undefined) {
                <div
                    *gridLayoutCells="let cell; rows: o().cells"
                    class="dot"
                    style="background: red; position: static"
                >@if (cell.x === 3) {<i></i>}</div>
                <test-cells-probe />
            }
        </div>
    `,
})
class Constrained {
    readonly options = input<ConstrainedOptions>({});
    protected readonly o = this.options;
    readonly gap = [10, 10] as const;
    readonly layout = layout;
}

const itemEl = (id: string) =>
    document.querySelector(`[data-item-id="${id}"]`) as HTMLElement;

describe("Root's constraints", () => {
    it("shape a pointer drag, its preview and its commit alike", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        await render(Constrained, {
            options: {
                constraints: [gridBounds, minMaxSize, snapToGrid(3)],
                onLayoutChange,
                placeholder: true,
            },
        });
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
        ).toMatchObject({ x: 3 });
    });

    it("resolve an item's own constraints from the registry", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        await render(Constrained, {
            options: {
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
            },
        });
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
        await render(Constrained, { options: { scale: 0.5, onLayoutChange } });
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

describe("[gridLayoutCells]", () => {
    it.each(["ltr", "rtl"] as const)(
        "renders cols × rows cells, each where a 1 × 1 item there sits (%s)",
        async (dir) => {
            stubBrowser();
            await render(Constrained, {
                options: {
                    dir,
                    defaultLayout: [{ id: "one", x: 3, y: 1, w: 1, h: 1 }],
                    allowOverlap: true,
                    cells: 2,
                },
            });
            const all = [
                ...document.querySelectorAll<HTMLElement>(
                    '[data-grid-layout-part="cell"]',
                ),
            ];
            expect(all).toHaveLength(24);
            const at = all.find(
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
            // the same cells, for an app that renders its own
            expect(cells?.()).toHaveLength(24);
            expect(cells?.()[15]?.attributes).toEqual({
                "data-grid-layout-part": "cell",
                "data-x": "3",
                "data-y": "1",
            });
        },
    );

    it("grows with the layout under `auto`, the preview's during a gesture", async () => {
        stubBrowser();
        await render(Constrained, { options: { cells: "auto" } });
        const count = () =>
            document.querySelectorAll('[data-grid-layout-part="cell"]').length;
        expect(count()).toBe(24);
        const press = await pointer(itemEl("a"), ...cell(0, 0));
        await press.move(...cell(7, 0));
        expect(count()).toBe(24);
        await press.release(...cell(7, 0));
    });
});
