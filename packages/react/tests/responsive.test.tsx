import type { Layout } from "@fragiola/grid-layout";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    type BreakpointInfo,
    createGridLayoutRef,
    GridLayout,
    type RootProps,
    useBreakpoint,
} from "../src";

// Responsive grids in React (R1–R4): the breakpoint from the grid's width (here the `width`
// prop), controlled or not, layouts per breakpoint, controlled or not, and what is told.

const BREAKPOINTS = { lg: 996, sm: 0 };
const COLS = { lg: 12, sm: 6 };
const LG: Layout = [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 8, h: 2 },
];

let seen: BreakpointInfo | undefined;
function Seen() {
    seen = useBreakpoint();
    return null;
}

function Grid(props: Partial<RootProps>) {
    return (
        <GridLayout.Root
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={50}
            gap={[10, 10]}
            width={1200}
            data-testid="grid"
            {...props}
        >
            <GridLayout.Items>
                {(item) => (
                    <GridLayout.Item
                        itemId={item.id}
                        data-testid={`item-${item.id}`}
                    />
                )}
            </GridLayout.Items>
            <Seen />
        </GridLayout.Root>
    );
}

describe("a responsive root", () => {
    it("takes the breakpoint the width gives, tells it once, and the generated layout with every layout", () => {
        const onBreakpointChange = vi.fn();
        const onLayoutChange = vi.fn();
        const { rerender } = render(
            <Grid
                defaultLayouts={{ lg: LG }}
                onBreakpointChange={onBreakpointChange}
                onLayoutChange={onLayoutChange}
            />,
        );
        const grid = screen.getByTestId("grid");
        expect(grid.getAttribute("data-breakpoint")).toBe("lg");
        expect(seen).toEqual({ breakpoint: "lg", cols: 12, width: 1200 });
        expect(onLayoutChange).not.toHaveBeenCalled();
        rerender(
            <Grid
                width={800}
                defaultLayouts={{ lg: LG }}
                onBreakpointChange={onBreakpointChange}
                onLayoutChange={onLayoutChange}
            />,
        );
        expect(grid.getAttribute("data-breakpoint")).toBe("sm");
        expect(seen).toEqual({ breakpoint: "sm", cols: 6, width: 800 });
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith("sm", 6);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const [layout, layouts] = onLayoutChange.mock.calls[0] ?? [];
        expect(layout).toEqual([
            { id: "a", x: 0, y: 0, w: 4, h: 2 },
            { id: "b", x: 0, y: 2, w: 6, h: 2 },
        ]);
        expect(Object.keys(layouts).sort()).toEqual(["lg", "sm"]);
    });

    it("lets a controlled breakpoint override the width", () => {
        render(<Grid defaultLayouts={{ lg: LG }} breakpoint="sm" />);
        expect(screen.getByTestId("grid").getAttribute("data-breakpoint")).toBe(
            "sm",
        );
    });

    it("places items with the breakpoint's own row height", () => {
        const { rerender } = render(
            <Grid defaultLayouts={{ lg: LG }} rowHeight={{ lg: 50, sm: 20 }} />,
        );
        expect(screen.getByTestId("item-a").style.height).toBe("110px");
        rerender(
            <Grid
                width={800}
                defaultLayouts={{ lg: LG }}
                rowHeight={{ lg: 50, sm: 20 }}
            />,
        );
        expect(screen.getByTestId("item-a").style.height).toBe("50px");
    });

    it("keeps controlled layouts the parent takes, and never loops with one that ignores them", () => {
        const told = vi.fn();
        function Parent({ width }: { width: number }) {
            const [layouts, setLayouts] = useState<Record<string, Layout>>({
                lg: LG,
            });
            return (
                <Grid
                    width={width}
                    layouts={layouts}
                    onLayoutChange={(_layout, all) => {
                        told();
                        setLayouts({ ...all });
                    }}
                />
            );
        }
        const { rerender } = render(<Parent width={1200} />);
        rerender(<Parent width={800} />);
        expect(told).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("item-b").style.width).not.toBe("");

        const ignored = vi.fn();
        const fixed = { lg: LG };
        const { rerender: again } = render(
            <Grid width={1200} layouts={fixed} onLayoutChange={ignored} />,
        );
        again(<Grid width={800} layouts={fixed} onLayoutChange={ignored} />);
        expect(ignored).toHaveBeenCalledTimes(1);
        again(<Grid width={800} layouts={fixed} onLayoutChange={ignored} />);
        expect(ignored).toHaveBeenCalledTimes(1);
    });

    it("tells a switch to a breakpoint whose items changed meanwhile once", () => {
        const gridLayoutRef = createGridLayoutRef();
        const onLayoutChange = vi.fn();
        const { rerender } = render(
            <Grid
                gridLayoutRef={gridLayoutRef}
                defaultLayouts={{ lg: LG, sm: LG }}
                onLayoutChange={onLayoutChange}
            />,
        );
        act(() => {
            gridLayoutRef.current?.model.run("item.add", {
                item: { id: "c", x: 0, y: 0, w: 2, h: 1 },
            });
        });
        onLayoutChange.mockClear();
        rerender(
            <Grid
                width={800}
                gridLayoutRef={gridLayoutRef}
                defaultLayouts={{ lg: LG, sm: LG }}
                onLayoutChange={onLayoutChange}
            />,
        );
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(
            ((onLayoutChange.mock.calls[0]?.[0] ?? []) as Layout).map(
                (item) => item.id,
            ),
        ).toContain("c");
    });

    it("never applies a controlled layout to the breakpoint after its own", () => {
        function Parent({ width }: { width: number }) {
            const [layout, setLayout] = useState<Layout>(LG);
            return (
                <Grid
                    width={width}
                    layout={layout}
                    onLayoutChange={(next) => setLayout(next)}
                />
            );
        }
        const { rerender } = render(<Parent width={1200} />);
        rerender(<Parent width={800} />);
        // sm's own layout: b below a in six columns, not lg's b clamped beside it
        expect(screen.getByTestId("item-b").style.transform).not.toBe(
            screen.getByTestId("item-a").style.transform,
        );
        expect(seen?.breakpoint).toBe("sm");
        const b = screen.getByTestId("item-b").style.transform;
        expect(b).toMatch(/translate\(\d+px, [1-9]\d+px\)/);
    });

    it("switches once, to the width's, when new breakpoints drop the active one", () => {
        const onBreakpointChange = vi.fn();
        const { rerender } = render(
            <Grid
                defaultLayouts={{ lg: LG }}
                onBreakpointChange={onBreakpointChange}
            />,
        );
        rerender(
            <Grid
                defaultLayouts={{ lg: LG }}
                breakpoints={{ desktop: 900, phone: 0 }}
                cols={{ desktop: 12, phone: 4 }}
                onBreakpointChange={onBreakpointChange}
            />,
        );
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith("desktop", 12);
    });

    it("tells no layout change on mount for a breakpoint alone", () => {
        const onLayoutChange = vi.fn();
        const onBreakpointChange = vi.fn();
        render(
            <Grid
                width={600}
                defaultLayouts={{
                    lg: LG,
                    sm: [
                        { id: "a", x: 0, y: 0, w: 4, h: 2 },
                        { id: "b", x: 0, y: 2, w: 6, h: 2 },
                    ],
                }}
                onLayoutChange={onLayoutChange}
                onBreakpointChange={onBreakpointChange}
            />,
        );
        expect(onBreakpointChange).toHaveBeenCalledWith("sm", 6);
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("tells the breakpoint the first measure gives", () => {
        const onBreakpointChange = vi.fn();
        render(
            <Grid
                width={600}
                defaultLayouts={{ lg: LG }}
                onBreakpointChange={onBreakpointChange}
            />,
        );
        expect(onBreakpointChange).toHaveBeenCalledTimes(1);
        expect(onBreakpointChange).toHaveBeenCalledWith("sm", 6);
    });

    it("configures nothing again for maps written inline, and throws on unusable ones", () => {
        const gridLayoutRef = createGridLayoutRef();
        const { rerender } = render(
            <Grid gridLayoutRef={gridLayoutRef} defaultLayouts={{ lg: LG }} />,
        );
        let configured = 0;
        act(() => {
            gridLayoutRef.current?.model.use((ctx, next) => {
                if (ctx.command === "grid.configure") configured++;
                return next();
            });
        });
        rerender(
            <Grid
                gridLayoutRef={gridLayoutRef}
                defaultLayouts={{ lg: LG }}
                breakpoints={{ ...BREAKPOINTS }}
                cols={{ ...COLS }}
            />,
        );
        expect(configured).toBe(0);
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Grid layouts={{ lg: LG, tablet: LG }} />)).toThrow(
            /no breakpoint "tablet"/,
        );
        expect(() => render(<Grid cols={{ lg: 12 }} />)).toThrow(/cols/);
        spy.mockRestore();
    });

    it("tells the breakpoint from outside the root, through its ref", () => {
        const gridLayoutRef = createGridLayoutRef();
        let outside: BreakpointInfo | undefined;
        function Outside() {
            outside = useBreakpoint(gridLayoutRef);
            return null;
        }
        render(
            <>
                <Outside />
                <Grid
                    defaultLayouts={{ lg: LG }}
                    gridLayoutRef={gridLayoutRef}
                />
            </>,
        );
        expect(outside).toEqual({ breakpoint: "lg", cols: 12, width: 1200 });
    });

    it("leaves a grid without breakpoints as it was", () => {
        const onBreakpointChange = vi.fn();
        render(
            <GridLayout.Root
                width={600}
                defaultLayout={LG}
                onBreakpointChange={onBreakpointChange}
                data-testid="plain"
            />,
        );
        expect(
            screen.getByTestId("plain").getAttribute("data-breakpoint"),
        ).toBe("default");
        expect(onBreakpointChange).not.toHaveBeenCalled();
    });
});
