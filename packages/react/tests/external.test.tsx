import type { Layout } from "@fragiola/grid-layout";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    createGridLayoutRef,
    type DropDetails,
    GridLayout,
    type GridLayoutContextValue,
    type GridLayoutRef,
    type RootProps,
    useGridLayout,
} from "../src";
import { cell, GEOMETRY, pointer, stubBrowser } from "./helpers";

// Drops from outside the grid in React (X1, X5, X6): the ref, a drag source and a drag preview
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

/** What the grid inside the root says it is, for comparing with the ref's. */
let inside: GridLayoutContextValue | undefined;
function Inside() {
    inside = useGridLayout();
    return null;
}

function Board(
    props: Partial<RootProps> & {
        gridLayoutRef: GridLayoutRef;
        onSourceDrop?: (drop: DropDetails) => void;
        disabled?: boolean;
        showSource?: boolean;
    },
) {
    const {
        gridLayoutRef,
        onSourceDrop,
        disabled,
        showSource = true,
        ...rest
    } = props;
    return (
        <>
            <aside>
                {showSource && (
                    <GridLayout.DragSource
                        gridLayoutRef={gridLayoutRef}
                        item={{ w: 2, h: 1 }}
                        data={{ kind: "note" }}
                        disabled={disabled}
                        onDrop={onSourceDrop}
                        data-testid="source"
                    />
                )}
                <GridLayout.DragPreview
                    gridLayoutRef={gridLayoutRef}
                    data-testid="preview"
                >
                    {(state) => (state.data as { kind: string }).kind}
                </GridLayout.DragPreview>
            </aside>
            <GridLayout.Root
                {...GEOMETRY}
                defaultLayout={two}
                gridLayoutRef={gridLayoutRef}
                data-testid="grid"
                {...rest}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            data-testid={`item-${item.id}`}
                        />
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder data-testid="placeholder" />
                <Inside />
            </GridLayout.Root>
        </>
    );
}

describe("gridLayoutRef", () => {
    it("is null before a root holds it, the root's grid while it does, null after", () => {
        const gridLayoutRef = createGridLayoutRef();
        expect(gridLayoutRef.current).toBeNull();
        const { unmount } = render(<Board gridLayoutRef={gridLayoutRef} />);
        expect(gridLayoutRef.current).not.toBeNull();
        expect(gridLayoutRef.current?.model).toBe(inside?.model);
        expect(gridLayoutRef.current?.engine).toBe(inside?.engine);
        unmount();
        expect(gridLayoutRef.current).toBeNull();
    });

    it("runs a command that changes the rendered grid", () => {
        const gridLayoutRef = createGridLayoutRef();
        render(<Board gridLayoutRef={gridLayoutRef} />);
        act(() => {
            gridLayoutRef.current?.model.run("item.add", {
                item: { id: "c", x: 4, y: 0, w: 1, h: 1 },
            });
        });
        expect(screen.getByTestId("item-c")).toBeTruthy();
    });

    it("is held already when a mount callback runs", () => {
        const gridLayoutRef = createGridLayoutRef();
        let held: unknown = "not called";
        render(
            <GridLayout.Root
                {...GEOMETRY}
                gridLayoutRef={gridLayoutRef}
                // overlapping: corrected on mount, and told
                defaultLayout={[...two, { id: "c", x: 0, y: 0, w: 1, h: 1 }]}
                onLayoutChange={() => {
                    held = gridLayoutRef.current;
                }}
            />,
        );
        expect(held).toBe(gridLayoutRef.current);
        expect(held).not.toBeNull();
    });

    it("follows the grid from outside, for a hook given the ref", () => {
        const gridLayoutRef = createGridLayoutRef();
        let outside: GridLayoutContextValue | null = null;
        function Outside() {
            outside = useGridLayout(gridLayoutRef);
            return null;
        }
        render(
            <>
                <Outside />
                <Board gridLayoutRef={gridLayoutRef} />
            </>,
        );
        expect(outside).toBe(gridLayoutRef.current);
        expect((outside as GridLayoutContextValue | null)?.model).toBe(
            inside?.model,
        );
    });
});

describe("GridLayout.DragSource", () => {
    it("drops a new item from outside the root, told to the root and the source", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDrop = vi.fn();
        const onSourceDrop = vi.fn();
        const onLayoutChange = vi.fn();
        render(
            <Board
                gridLayoutRef={gridLayoutRef}
                onDrop={onDrop}
                onSourceDrop={onSourceDrop}
                onLayoutChange={onLayoutChange}
            />,
        );
        expect(screen.queryByTestId("preview")).toBeNull();
        const source = screen.getByTestId("source");
        const press = pointer(source, 1300, 500);
        press.move(...centre(4, 0));
        const grid = screen.getByTestId("grid");
        expect(grid.hasAttribute("data-dropping")).toBe(true);
        expect(source.hasAttribute("data-dragging")).toBe(true);
        expect(
            screen.getByTestId("placeholder").getAttribute("data-kind"),
        ).toBe("drop");
        const preview = screen.getByTestId("preview");
        expect(preview.textContent).toBe("note");
        expect(preview.style.position).toBe("fixed");
        expect(preview.style.transform).toContain("translate(");
        expect(onLayoutChange).not.toHaveBeenCalled();
        act(() => press.release(...centre(4, 0)));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const told = {
            item: expect.objectContaining({ x: 4, y: 0, w: 2, h: 1 }),
            data: { kind: "note" },
            layout: expect.any(Array),
        };
        expect(onDrop).toHaveBeenCalledWith(told);
        expect(onSourceDrop).toHaveBeenCalledWith(told);
        expect(screen.queryByTestId("preview")).toBeNull();
        expect(grid.hasAttribute("data-dropping")).toBe(false);
        const id = onDrop.mock.calls[0]?.[0].item.id as string;
        expect(screen.getByTestId(`item-${id}`)).toBeTruthy();
    });

    it("is a tab stop that grabs from the keyboard, and focuses the item it adds", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        render(<Board gridLayoutRef={gridLayoutRef} />);
        const source = screen.getByTestId("source");
        expect(source.tabIndex).toBe(0);
        act(() => source.focus());
        fireEvent.keyDown(source, { key: "Enter" });
        expect(source.hasAttribute("data-grabbed")).toBe(true);
        // the doc's listener takes the steps, wherever the source is
        act(() => {
            source.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "ArrowDown",
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });
        fireEvent.keyDown(source, { key: "Enter" });
        const layout = gridLayoutRef.current?.model.get("layout") ?? [];
        expect(layout).toHaveLength(3);
        const added = layout.find((item) => item.id !== "a" && item.id !== "b");
        expect(document.activeElement).toBe(
            screen.getByTestId(`item-${added?.id}`),
        );
    });

    it("starts nothing when disabled, and is no tab stop", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        render(<Board gridLayoutRef={gridLayoutRef} disabled />);
        const source = screen.getByTestId("source");
        expect(source.hasAttribute("data-disabled")).toBe(true);
        expect(source.tabIndex).toBe(-1);
        const press = pointer(source, 1300, 500);
        press.move(...centre(4, 0));
        expect(screen.getByTestId("grid").hasAttribute("data-dropping")).toBe(
            false,
        );
        fireEvent.keyDown(source, { key: "Enter" });
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
    });

    it("ends the drop it started when it leaves the page", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const { rerender } = render(<Board gridLayoutRef={gridLayoutRef} />);
        const press = pointer(screen.getByTestId("source"), 1300, 500);
        press.move(...centre(4, 0));
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeDefined();
        rerender(<Board gridLayoutRef={gridLayoutRef} showSource={false} />);
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(2);
    });

    it("works inside the root without a ref", () => {
        stubBrowser();
        const onDrop = vi.fn();
        render(
            <GridLayout.Root {...GEOMETRY} defaultLayout={two} onDrop={onDrop}>
                <GridLayout.DragSource
                    item={{ w: 1, h: 1 }}
                    data-testid="inner"
                />
            </GridLayout.Root>,
        );
        const press = pointer(screen.getByTestId("inner"), 600, 20);
        press.move(...centre(6, 0));
        act(() => press.release(...centre(6, 0)));
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("works inside an item, without moving the item", () => {
        stubBrowser();
        const onDrop = vi.fn();
        render(
            <GridLayout.Root {...GEOMETRY} defaultLayout={two} onDrop={onDrop}>
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item itemId={item.id}>
                            {item.id === "a" && (
                                <GridLayout.DragSource
                                    item={{ w: 1, h: 1 }}
                                    data-testid="palette"
                                />
                            )}
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
            </GridLayout.Root>,
        );
        const press = pointer(screen.getByTestId("palette"), ...cell(0, 0));
        press.move(...centre(6, 0));
        act(() => press.release(...centre(6, 0)));
        expect(onDrop).toHaveBeenCalledTimes(1);
        const layout = onDrop.mock.calls[0]?.[0].layout as Layout;
        expect(layout.find((item) => item.id === "a")).toMatchObject({
            x: 0,
            y: 0,
        });
    });

    it("throws a clear error outside a root without a ref", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() =>
            render(<GridLayout.DragSource item={{ w: 1, h: 1 }} />),
        ).toThrow(/inside a GridLayout.Root, or take a gridLayoutRef/);
        spy.mockRestore();
    });
});

describe("GridLayout.DragPreview", () => {
    it("runs the app's functions of its state only during a drop", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const className = vi.fn(
            (state: { data: unknown }) => (state.data as { kind: string }).kind,
        );
        render(
            <>
                <GridLayout.DragPreview
                    gridLayoutRef={gridLayoutRef}
                    className={className}
                    data-testid="styled"
                />
                <Board gridLayoutRef={gridLayoutRef} />
            </>,
        );
        expect(className).not.toHaveBeenCalled();
        const press = pointer(screen.getByTestId("source"), 1300, 500);
        press.move(...centre(4, 0));
        expect(screen.getByTestId("styled").className).toBe("note");
        act(() => press.release(...centre(4, 0)));
    });
});

describe("native drags on the root", () => {
    /** A native drag event (jsdom has no `DragEvent`): a mouse event with a `dataTransfer`. */
    function drag(
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
        act(() => {
            target.dispatchEvent(event);
        });
    }

    it("marks a refused drag, and drops what it accepts with the drop's data", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDrop = vi.fn();
        let accept = false;
        render(
            <Board
                gridLayoutRef={gridLayoutRef}
                onDrop={onDrop}
                onExternalDrag={(event) =>
                    accept
                        ? {
                              w: 2,
                              h: 1,
                              data: Array.from(
                                  (event.dataTransfer?.files ??
                                      []) as ArrayLike<{ name: string }>,
                                  (file) => file.name,
                              ),
                          }
                        : false
                }
            />,
        );
        const grid = screen.getByTestId("grid");
        drag(grid, "dragenter", centre(4, 0));
        expect(grid.hasAttribute("data-drop-refused")).toBe(true);
        drag(grid, "dragleave", centre(4, 0));
        expect(grid.hasAttribute("data-drop-refused")).toBe(false);
        accept = true;
        drag(grid, "dragenter", centre(4, 0));
        expect(grid.hasAttribute("data-dropping")).toBe(true);
        drag(grid, "drop", centre(4, 0));
        expect(onDrop).toHaveBeenCalledWith(
            expect.objectContaining({ data: ["plan.pdf"] }),
        );
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(3);
    });
});

describe("dragging an item off the grid", () => {
    it("marks the root and the item, and tells onDragStop it ended outside", () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDragStop = vi.fn();
        render(<Board gridLayoutRef={gridLayoutRef} onDragStop={onDragStop} />);
        const item = screen.getByTestId("item-a");
        const press = pointer(item, ...cell(0, 0));
        press.move(1400, 20);
        expect(screen.getByTestId("grid").hasAttribute("data-outside")).toBe(
            true,
        );
        expect(item.hasAttribute("data-outside")).toBe(true);
        act(() => press.release(1400, 20));
        expect(onDragStop).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag-stop", outside: true }),
        );
        expect(
            gridLayoutRef.current?.model.get("item-by", { itemId: "a" }),
        ).toMatchObject({ x: 0, y: 0 });
    });
});
