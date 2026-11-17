import { Component, input, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import {
    type BreakpointChange,
    type BreakpointInfo,
    createGridLayoutRef,
    GRID_LAYOUT,
    type GridLayoutRef,
    injectBreakpoint,
    type Layout,
} from "../src/public-api";
import { render, setInput, settle } from "./helpers";

// Responsive grids in Angular (R1–R4): the breakpoint from the grid's width (here the `width`
// input), controlled or not, layouts per breakpoint, controlled or not, and what is told.

const BREAKPOINTS = { lg: 996, sm: 0 };
const COLS = { lg: 12, sm: 6 };
const LG: Layout = [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 8, h: 2 },
];

let seen: Signal<BreakpointInfo> | undefined;

@Component({ selector: "test-seen", template: "" })
class Seen {
    constructor() {
        seen = injectBreakpoint();
    }
}

interface ResponsiveOptions {
    width?: number;
    breakpoints?: Record<string, number>;
    cols?: number | Record<string, number>;
    breakpoint?: string;
    rowHeight?: number | Record<string, number>;
    layouts?: Readonly<Record<string, Layout>>;
    defaultLayouts?: Readonly<Record<string, Layout>>;
    defaultLayout?: Layout;
    gridLayoutRef?: GridLayoutRef;
    onBreakpointChange?: (change: BreakpointChange) => void;
    onLayoutChange?: (layout: Layout) => void;
    onLayoutsChange?: (layouts: Readonly<Record<string, Layout>>) => void;
}

@Component({
    selector: "test-grid-r",
    imports: [GRID_LAYOUT, Seen],
    template: `
        <div
            gridLayoutRoot
            data-testid="grid"
            [breakpoints]="'breakpoints' in o() ? o().breakpoints : breakpoints"
            [cols]="'cols' in o() ? o().cols : cols"
            [rowHeight]="o().rowHeight ?? 50"
            [gap]="gap"
            [width]="o().width ?? 1200"
            [breakpoint]="o().breakpoint"
            [layouts]="o().layouts"
            [defaultLayouts]="o().defaultLayouts"
            [defaultLayout]="o().defaultLayout"
            [gridLayoutRef]="o().gridLayoutRef"
            (breakpointChange)="o().onBreakpointChange?.($event)"
            (layoutChange)="o().onLayoutChange?.($event)"
            (layoutsChange)="o().onLayoutsChange?.($event)"
        >
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.data-testid]="'item-' + item.id"></div>
            </ng-template>
            <test-seen />
        </div>
    `,
})
class Grid {
    readonly options = input<ResponsiveOptions>({});
    protected readonly o = this.options;
    readonly breakpoints = BREAKPOINTS;
    readonly cols = COLS;
    readonly gap = [10, 10] as const;
}

/** A parent that keeps the layouts and takes every change, at a width it sets. */
@Component({
    selector: "test-keeps",
    imports: [Grid],
    template: `<test-grid-r [options]="{ width: width(), layouts: layouts(), onLayoutsChange: take }" />`,
})
class Keeps {
    readonly width = signal(1200);
    readonly layouts = signal<Readonly<Record<string, Layout>>>({ lg: LG });
    readonly told = vi.fn();
    readonly take = (all: Readonly<Record<string, Layout>>) => {
        this.told();
        this.layouts.set({ ...all });
    };
}

/** A parent that writes its layouts anew at every render, and renders again on each change. */
@Component({
    selector: "test-anew",
    imports: [Grid],
    template: `<test-grid-r [attr.data-renders]="renders()" [options]="{ width: width(), layouts: { lg: lg }, onLayoutChange: tell }" />`,
})
class Anew {
    readonly lg = LG;
    readonly width = signal(1200);
    readonly renders = signal(0);
    readonly told = vi.fn();
    readonly tell = () => {
        this.told();
        this.renders.update((value) => value + 1);
    };
}

let outside: Signal<BreakpointInfo | undefined> | undefined;

@Component({
    selector: "test-from-outside",
    imports: [Grid],
    template: `<test-grid-r [options]="{ defaultLayouts: { lg: lg }, gridLayoutRef }" />`,
})
class FromOutside {
    readonly lg = LG;
    readonly gridLayoutRef = createGridLayoutRef();
    constructor() {
        outside = injectBreakpoint(this.gridLayoutRef);
    }
}

const testId = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`) as HTMLElement;

describe("a responsive root", () => {
    it("takes the breakpoint the width gives, tells it once, and the generated layout with every layout", async () => {
        const onBreakpointChange = vi.fn();
        const onLayoutChange = vi.fn();
        const onLayoutsChange = vi.fn();
        const options = {
            defaultLayouts: { lg: LG },
            onBreakpointChange,
            onLayoutChange,
            onLayoutsChange,
        };
        const fixture = await render(Grid, { options });
        const grid = testId("grid");
        expect(grid.getAttribute("data-breakpoint")).toBe("lg");
        expect(seen?.()).toEqual({ breakpoint: "lg", cols: 12, width: 1200 });
        expect(onLayoutChange).not.toHaveBeenCalled();
        await setInput(fixture, "options", { ...options, width: 800 });
        expect(grid.getAttribute("data-breakpoint")).toBe("sm");
        expect(seen?.()).toEqual({ breakpoint: "sm", cols: 6, width: 800 });
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith({
            breakpoint: "sm",
            cols: 6,
        });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 0, y: 0, w: 4, h: 2 },
            { id: "b", x: 0, y: 2, w: 6, h: 2 },
        ]);
        expect(onLayoutsChange).toHaveBeenCalledTimes(1);
        const [layouts] = onLayoutsChange.mock.calls[0] ?? [];
        expect(Object.keys(layouts).sort()).toEqual(["lg", "sm"]);
    });

    it("lets a controlled breakpoint override the width", async () => {
        await render(Grid, {
            options: { defaultLayouts: { lg: LG }, breakpoint: "sm" },
        });
        expect(testId("grid").getAttribute("data-breakpoint")).toBe("sm");
    });

    it("places items with the breakpoint's own row height", async () => {
        const options = {
            defaultLayouts: { lg: LG },
            rowHeight: { lg: 50, sm: 20 },
        };
        const fixture = await render(Grid, { options });
        expect(testId("item-a").style.height).toBe("110px");
        await setInput(fixture, "options", { ...options, width: 800 });
        expect(testId("item-a").style.height).toBe("50px");
    });

    it("keeps [(layouts)], and never loops with a parent that takes them", async () => {
        const fixture = await render(Keeps);
        fixture.componentInstance.width.set(800);
        await settle();
        expect(fixture.componentInstance.told).toHaveBeenCalledTimes(1);
        expect(Object.keys(fixture.componentInstance.layouts()).sort()).toEqual(
            ["lg", "sm"],
        );
        expect(testId("item-b").style.width).not.toBe("");
    });

    it("takes layouts written anew at every render, with no update loop (react-grid-layout#2202)", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const fixture = await render(Anew);
        expect(fixture.componentInstance.told).not.toHaveBeenCalled();
        fixture.componentInstance.width.set(800);
        await settle();
        expect(fixture.componentInstance.told).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("tells no layout change on mount for a breakpoint alone, and the breakpoint the first measure gives", async () => {
        const onLayoutChange = vi.fn();
        const onBreakpointChange = vi.fn();
        await render(Grid, {
            options: {
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
            },
        });
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith({
            breakpoint: "sm",
            cols: 6,
        });
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("configures nothing again for maps written anew, and throws on unusable ones", async () => {
        const gridLayoutRef = createGridLayoutRef();
        const options = { gridLayoutRef, defaultLayouts: { lg: LG } };
        const fixture = await render(Grid, { options });
        let configured = 0;
        gridLayoutRef.current?.model.use((ctx, next) => {
            if (ctx.command === "grid.configure") configured++;
            return next();
        });
        await setInput(fixture, "options", {
            ...options,
            breakpoints: { ...BREAKPOINTS },
            cols: { ...COLS },
        });
        expect(configured).toBe(0);
        const tablet = TestBed.createComponent(Grid);
        tablet.componentRef.setInput("options", {
            layouts: { lg: LG, tablet: LG },
        });
        expect(() => tablet.detectChanges()).toThrow(/no breakpoint "tablet"/);
        const cols = TestBed.createComponent(Grid);
        cols.componentRef.setInput("options", { cols: { lg: 12 } });
        expect(() => cols.detectChanges()).toThrow(/cols/);
    });

    it("tells the breakpoint from outside the root, through its ref", async () => {
        await render(FromOutside);
        expect(outside?.()).toEqual({
            breakpoint: "lg",
            cols: 12,
            width: 1200,
        });
    });

    it("leaves a grid without breakpoints as it was", async () => {
        const onBreakpointChange = vi.fn();
        await render(Grid, {
            options: {
                width: 600,
                breakpoints: undefined,
                cols: undefined,
                defaultLayout: LG,
                onBreakpointChange,
            },
        });
        expect(testId("grid").getAttribute("data-breakpoint")).toBe("default");
        expect(onBreakpointChange).not.toHaveBeenCalled();
    });
});
