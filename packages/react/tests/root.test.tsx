import type { Layout } from "@fragiola/grid-layout";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { GridLayout, type RootProps, useGridLayout, veto } from "../src";
import { cell, GEOMETRY, pointer, stubBrowser } from "./helpers";

const two: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

function Grid(props: RootProps & { onRender?: () => void }) {
    const { onRender, ...rest } = props;
    return (
        <GridLayout.Root {...GEOMETRY} aria-label="dashboard" {...rest}>
            <GridLayout.Items>
                {(item) => (
                    <Profiler id={item.id} onRender={() => onRender?.()}>
                        <GridLayout.Item itemId={item.id} aria-label={item.id}>
                            {item.id}
                            <GridLayout.ResizeHandle
                                side="bottom-end"
                                aria-label={`resize ${item.id}`}
                            />
                        </GridLayout.Item>
                    </Profiler>
                )}
            </GridLayout.Items>
            <GridLayout.Placeholder aria-label="placeholder" />
        </GridLayout.Root>
    );
}

const box = (name: string) => screen.getByLabelText(name);

describe("GridLayout.Root", () => {
    it("renders the items at their boxes, the root as tall as the layout", () => {
        render(<Grid defaultLayout={two} />);
        // column 2 starts at 10 + 2 × 99.17, rounded
        expect(box("b").style.transform).toBe("translate(208px, 10px)");
        expect(box("dashboard").style.height).toBe("130px");
        expect(box("a").getAttribute("data-grid-layout-part")).toBe("item");
        expect(box("a").tabIndex).toBe(0);
    });

    it("uncontrolled: a drop stands, and onLayoutChange is told once (react-grid-layout#1984)", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        render(<Grid defaultLayout={two} onLayoutChange={onLayoutChange} />);
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(
            ...(cell(0, 0).map((v, i) => (i === 0 ? v + 8 : v)) as [
                number,
                number,
            ]),
        );
        press.move(...cell(2, 0));
        expect(onLayoutChange).not.toHaveBeenCalled();
        press.release(...cell(2, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 2, y: 0, w: 2, h: 2 },
            { id: "b", x: 2, y: 2, w: 2, h: 2 },
        ]);
    });

    it("controlled: a parent that ignores onLayoutChange keeps the items where they were", () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        render(<Grid layout={two} onLayoutChange={onLayoutChange} />);
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(...cell(2, 0));
        press.release(...cell(2, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("controlled: a parent that takes the change renders it", () => {
        stubBrowser();
        function Parent() {
            const [layout, setLayout] = useState(two);
            return <Grid layout={layout} onLayoutChange={setLayout} />;
        }
        render(<Parent />);
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(...cell(2, 0));
        press.release(...cell(2, 0));
        expect(box("b").style.transform).toBe("translate(208px, 130px)");
    });

    it("tells a corrected layout on mount, and nothing for a valid one", () => {
        const onLayoutChange = vi.fn();
        const { unmount } = render(
            <Grid defaultLayout={two} onLayoutChange={onLayoutChange} />,
        );
        expect(onLayoutChange).not.toHaveBeenCalled();
        unmount();
        render(
            <Grid
                defaultLayout={[{ id: "a", x: 20, y: 5, w: 2, h: 2 }]}
                onLayoutChange={onLayoutChange}
            />,
        );
        expect(onLayoutChange).toHaveBeenCalledWith(
            [{ id: "a", x: 10, y: 0, w: 2, h: 2 }],
            { default: expect.any(Array) },
        );
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
    });

    it("renders no React commit while a drag stays over one cell", () => {
        stubBrowser();
        const onRender = vi.fn();
        render(<Grid defaultLayout={two} onRender={onRender} />);
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(cell(0, 0)[0] + 10, cell(0, 0)[1]);
        const commits = onRender.mock.calls.length;
        for (let dx = 12; dx < 40; dx += 4)
            press.move(cell(0, 0)[0] + dx, cell(0, 0)[1]);
        expect(onRender.mock.calls.length).toBe(commits);
        press.move(...cell(2, 0));
        expect(onRender.mock.calls.length).toBeGreaterThan(commits);
        press.release(...cell(2, 0));
    });

    it("shows the placeholder only during a gesture, and the gesture's data on the root", () => {
        stubBrowser();
        render(<Grid defaultLayout={two} />);
        expect(screen.queryByLabelText("placeholder")).toBeNull();
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(...cell(1, 1));
        expect(box("placeholder").getAttribute("data-kind")).toBe("move");
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(true);
        expect(box("a").hasAttribute("data-dragging")).toBe(true);
        press.release(...cell(1, 1));
        expect(screen.queryByLabelText("placeholder")).toBeNull();
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(false);
    });

    it("calls the gesture callbacks", () => {
        stubBrowser();
        const onDragStart = vi.fn();
        const onDragStop = vi.fn();
        render(
            <Grid
                defaultLayout={two}
                onDragStart={onDragStart}
                onDragStop={onDragStop}
            />,
        );
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(...cell(1, 0));
        press.release(...cell(1, 0));
        expect(onDragStart).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag-start", itemId: "a" }),
        );
        expect(onDragStop).toHaveBeenCalledTimes(1);
    });

    it("lets the app veto a press with preventDefault", () => {
        stubBrowser();
        const onDragStart = vi.fn();
        render(
            <Grid
                defaultLayout={two}
                onDragStart={onDragStart}
                onPointerDown={(event) => event.preventDefault()}
            />,
        );
        const press = pointer(box("a"), ...cell(0, 0));
        press.move(...cell(2, 1));
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("grabs and drops with the keyboard", () => {
        const onLayoutChange = vi.fn();
        render(<Grid defaultLayout={two} onLayoutChange={onLayoutChange} />);
        fireEvent.keyDown(box("b"), { key: " " });
        expect(box("b").hasAttribute("data-grabbed")).toBe(true);
        fireEvent.keyDown(box("b"), { key: "ArrowLeft" });
        fireEvent.keyDown(box("b"), { key: "ArrowLeft" });
        fireEvent.keyDown(box("b"), { key: "Enter" });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
    });

    it("lets the model's commands move the rendered items, and middleware refuse them", () => {
        let api: ReturnType<typeof useGridLayout> | undefined;
        function Grab() {
            api = useGridLayout();
            return null;
        }
        render(
            <GridLayout.Root
                {...GEOMETRY}
                defaultLayout={two}
                aria-label="dashboard"
            >
                <Grab />
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={item.id}
                        />
                    )}
                </GridLayout.Items>
            </GridLayout.Root>,
        );
        act(() => {
            api?.model.run("item.move", { itemId: "b", x: 0, y: 0 });
        });
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
        api?.model.use(() => veto());
        act(() => {
            api?.model.run("item.move", { itemId: "b", x: 4, y: 0 });
        });
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
    });

    it("re-settles when a rule changes, and tells it", () => {
        const onLayoutChange = vi.fn();
        const { rerender } = render(
            <Grid defaultLayout={two} onLayoutChange={onLayoutChange} />,
        );
        rerender(
            <Grid
                defaultLayout={two}
                onLayoutChange={onLayoutChange}
                cols={2}
            />,
        );
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
            { id: "b", x: 0, y: 2, w: 2, h: 2 },
        ]);
    });

    it("sets dir on the root and mirrors in right-to-left", () => {
        render(
            <Grid
                defaultLayout={[{ id: "a", x: 0, y: 0, w: 2, h: 2 }]}
                dir="rtl"
            />,
        );
        expect(box("dashboard").getAttribute("dir")).toBe("rtl");
        // 1200 − 10 − the item's 188px width
        expect(box("a").style.transform).toBe("translate(1002px, 10px)");
    });

    it("hides a resize handle while its item cannot be resized", () => {
        render(
            <Grid
                defaultLayout={[
                    { id: "a", x: 0, y: 0, w: 2, h: 2, static: true },
                    two[1] as never,
                ]}
            />,
        );
        expect(screen.queryByLabelText("resize a")).toBeNull();
        expect(
            screen.getByLabelText("resize b").getAttribute("data-side"),
        ).toBe("bottom-end");
    });

    it("moves the tab stop to a drag handle", () => {
        render(
            <GridLayout.Root {...GEOMETRY} defaultLayout={two}>
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item itemId={item.id} aria-label={item.id}>
                            {item.id === "a" ? (
                                <GridLayout.DragHandle aria-label="grip" />
                            ) : null}
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
            </GridLayout.Root>,
        );
        expect(box("a").tabIndex).toBe(-1);
        expect(box("grip").tabIndex).toBe(0);
        expect(box("b").tabIndex).toBe(0);
    });

    it("applies a controlled layout that must be corrected once, and tells it once", () => {
        const onLayoutChange = vi.fn();
        const messy: Layout = [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const { rerender } = render(
            <Grid layout={messy} onLayoutChange={onLayoutChange} />,
        );
        rerender(<Grid layout={messy} onLayoutChange={onLayoutChange} />);
        rerender(<Grid layout={messy} onLayoutChange={onLayoutChange} />);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange).toHaveBeenCalledWith(
            [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
            { default: expect.any(Array) },
        );
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("a parent that takes the corrected layout hears of it once", () => {
        const onChange = vi.fn();
        function Parent() {
            const [layout, setLayout] = useState<Layout>([
                { id: "a", x: 0, y: 5, w: 2, h: 2 },
            ]);
            return (
                <Grid
                    layout={layout}
                    onLayoutChange={(next) => {
                        onChange(next);
                        setLayout(next);
                    }}
                />
            );
        }
        render(<Parent />);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("tells a new prop that has to be corrected, even when the grid already shows it", () => {
        const onLayoutChange = vi.fn();
        const messy = (): Layout => [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const { rerender } = render(
            <Grid layout={messy()} onLayoutChange={onLayoutChange} />,
        );
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        rerender(<Grid layout={messy()} onLayoutChange={onLayoutChange} />);
        expect(onLayoutChange).toHaveBeenCalledTimes(2);
        expect(onLayoutChange).toHaveBeenLastCalledWith(
            [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
            { default: expect.any(Array) },
        );
    });

    it("tells a controlled layout once when a rule re-settles it", () => {
        const onLayoutChange = vi.fn();
        function Parent({ cols }: { cols: number }) {
            const [layout, setLayout] = useState<Layout>(two);
            return (
                <Grid
                    cols={cols}
                    layout={layout}
                    onLayoutChange={(next) => {
                        onLayoutChange(next);
                        setLayout(next);
                    }}
                />
            );
        }
        const { rerender } = render(<Parent cols={12} />);
        rerender(<Parent cols={2} />);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
    });

    it("tells nothing when only a rule changes and no item moves", () => {
        const onLayoutChange = vi.fn();
        const { rerender } = render(
            <Grid defaultLayout={two} onLayoutChange={onLayoutChange} />,
        );
        rerender(
            <Grid
                defaultLayout={two}
                onLayoutChange={onLayoutChange}
                preventCollision
            />,
        );
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("throws the same error for an invalid layout on mount and later", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const bad = [{ id: "a", x: 0, y: 0, w: 0, h: 1 }] as Layout;
        expect(() => render(<Grid layout={bad} />)).toThrow(/invalid layout/);
        const { rerender } = render(<Grid layout={two} />);
        expect(() => rerender(<Grid layout={bad} />)).toThrow(/invalid layout/);
        spy.mockRestore();
    });

    it("goes back to a rule's default when its prop is removed", () => {
        let api: ReturnType<typeof useGridLayout> | undefined;
        function Grab() {
            api = useGridLayout();
            return null;
        }
        const { rerender } = render(
            <GridLayout.Root
                {...GEOMETRY}
                cols={3}
                allowOverlap
                defaultLayout={two}
            >
                <Grab />
            </GridLayout.Root>,
        );
        expect(api?.model.state).toMatchObject({ cols: 3, allowOverlap: true });
        rerender(
            <GridLayout.Root {...GEOMETRY} defaultLayout={two}>
                <Grab />
            </GridLayout.Root>,
        );
        expect(api?.model.state).toMatchObject({
            cols: 12,
            allowOverlap: false,
        });
    });

    it("throws a clear error for a part outside a root or an item", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<GridLayout.Item itemId="a" />)).toThrow(
            /inside a GridLayout.Root/,
        );
        expect(() =>
            render(
                <GridLayout.Root {...GEOMETRY}>
                    <GridLayout.DragHandle />
                </GridLayout.Root>,
            ),
        ).toThrow(/inside a GridLayout.Item/);
        spy.mockRestore();
    });
});
