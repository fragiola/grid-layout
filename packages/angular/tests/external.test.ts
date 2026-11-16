import { Component, input, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import {
    createGridLayoutRef,
    type DropDetails,
    type ExternalDragAnswer,
    type GestureEvent,
    GRID_LAYOUT,
    type GridLayoutHandle,
    type GridLayoutRef,
    injectGridLayout,
    type Layout,
} from "../src/public-api";
import {
    cell,
    GEOMETRY,
    key,
    pointer,
    render,
    setInput,
    settle,
    stubBrowser,
} from "./helpers";

// Drops from outside the grid in Angular (X1, X5, X6): the ref, a drag source and a drag preview
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
let inside: Signal<GridLayoutHandle> | undefined;

@Component({ selector: "test-inside", template: "" })
class Inside {
    constructor() {
        inside = injectGridLayout();
    }
}

/** The root's inputs and outputs the board takes. */
interface BoardOptions {
    onDropped?: (drop: DropDetails) => void;
    onLayoutChange?: (layout: Layout) => void;
    onDragStop?: (event: GestureEvent) => void;
    externalDrag?: (event: DragEvent) => ExternalDragAnswer;
}

@Component({
    selector: "test-board",
    imports: [GRID_LAYOUT, Inside],
    template: `
        <aside>
            @if (showSource()) {
                <div
                    [gridLayoutDragSource]="{ w: 2, h: 1 }"
                    [gridLayoutRef]="gridLayoutRef()"
                    [data]="note"
                    [disabled]="disabled()"
                    (dropped)="onSourceDrop()?.($event)"
                    data-testid="source"
                ></div>
            }
            <div *gridLayoutDragPreview="gridLayoutRef(); let state" data-testid="preview">{{ kindOf(state.data) }}</div>
        </aside>
        <div
            gridLayoutRoot
            data-testid="grid"
            [width]="geometry.width"
            [rowHeight]="geometry.rowHeight"
            [gap]="geometry.gap"
            [defaultLayout]="two"
            [layout]="controlled() ? layout() : undefined"
            [gridLayoutRef]="gridLayoutRef()"
            [externalDrag]="options().externalDrag"
            [attr.data-drops]="drops()"
            (layoutChange)="changed($event)"
            (dropped)="drops.set(drops() + 1); options().onDropped?.($event)"
            (dragStop)="options().onDragStop?.($event)"
        >
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.data-testid]="'item-' + item.id"></div>
            </ng-template>
            <div *gridLayoutPlaceholder data-testid="placeholder"></div>
            <test-inside />
        </div>
    `,
})
class Board {
    readonly gridLayoutRef = input.required<GridLayoutRef>();
    readonly options = input<BoardOptions>({});
    readonly onSourceDrop = input<((drop: DropDetails) => void) | undefined>(
        undefined,
    );
    readonly disabled = input(false);
    readonly showSource = input(true);
    /** a parent that keeps the layout and takes every change */
    readonly controlled = input(false);
    readonly layout = signal<Layout>(two);
    /** the app's own state, set in the same drop */
    readonly drops = signal(0);
    readonly geometry = GEOMETRY;
    readonly two = two;
    readonly note = { kind: "note" };
    readonly kindOf = (data: unknown) => (data as { kind: string }).kind;
    readonly changed = (layout: Layout) => {
        if (this.controlled()) this.layout.set(layout);
        this.options().onLayoutChange?.(layout);
    };
}

@Component({
    selector: "test-inner-source",
    imports: [GRID_LAYOUT],
    template: `
        <div gridLayoutRoot [width]="1200" [rowHeight]="50" [gap]="gap" [defaultLayout]="two" (dropped)="dropped($event)">
            <div [gridLayoutDragSource]="{ w: 1, h: 1 }" data-testid="inner"></div>
        </div>
    `,
})
class InnerSource {
    readonly gap = [10, 10] as const;
    readonly two = two;
    readonly dropped = vi.fn();
}

@Component({
    selector: "test-loose-source",
    imports: [GRID_LAYOUT],
    template: `<div [gridLayoutDragSource]="{ w: 1, h: 1 }"></div>`,
})
class LooseSource {}

describe("gridLayoutRef", () => {
    it("is null before a root holds it, the root's grid while it does, null after", async () => {
        const gridLayoutRef = createGridLayoutRef();
        expect(gridLayoutRef.current).toBeNull();
        const fixture = await render(Board, { gridLayoutRef });
        expect(gridLayoutRef.current).not.toBeNull();
        expect(gridLayoutRef.current?.model).toBe(inside?.().model);
        expect(gridLayoutRef.current?.engine).toBe(inside?.().engine);
        fixture.destroy();
        expect(gridLayoutRef.current).toBeNull();
    });

    it("runs a command that changes the rendered grid", async () => {
        const gridLayoutRef = createGridLayoutRef();
        await render(Board, { gridLayoutRef });
        gridLayoutRef.current?.model.run("item.add", {
            item: { id: "c", x: 4, y: 0, w: 1, h: 1 },
        });
        await settle();
        expect(byTestId("item-c")).toBeTruthy();
    });

    it("is held already when the first (layoutChange) is told", async () => {
        const gridLayoutRef = createGridLayoutRef();
        let held: unknown = "not called";
        @Component({
            selector: "test-held",
            imports: [GRID_LAYOUT],
            template: `<div gridLayoutRoot [width]="1200" [gridLayoutRef]="gridLayoutRef" [defaultLayout]="overlapping" (layoutChange)="told()"></div>`,
        })
        class Held {
            readonly gridLayoutRef = gridLayoutRef;
            // overlapping: corrected on mount, and told
            readonly overlapping = [
                ...two,
                { id: "c", x: 0, y: 0, w: 1, h: 1 },
            ];
            readonly told = () => {
                held = gridLayoutRef.current;
            };
        }
        await render(Held);
        expect(held).toBe(gridLayoutRef.current);
        expect(held).not.toBeNull();
    });

    it("follows the grid from outside, for an injection function given the ref", async () => {
        const gridLayoutRef = createGridLayoutRef();
        let followed: Signal<GridLayoutHandle | null> | undefined;
        @Component({ selector: "test-follow", template: "" })
        class Follow {
            constructor() {
                followed = injectGridLayout(gridLayoutRef);
            }
        }
        @Component({
            selector: "test-following",
            imports: [Board, Follow],
            template: `<test-follow /><test-board [gridLayoutRef]="gridLayoutRef" />`,
        })
        class Following {
            readonly gridLayoutRef = gridLayoutRef;
        }
        await render(Following);
        expect(followed?.()).toBe(gridLayoutRef.current);
        expect(followed?.()?.model).toBe(inside?.().model);
    });
});

describe("[gridLayoutDragSource]", () => {
    it("drops a new item from outside the root, told to the root and the source", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDropped = vi.fn();
        const onSourceDrop = vi.fn();
        const onLayoutChange = vi.fn();
        await render(Board, {
            gridLayoutRef,
            options: { onDropped, onLayoutChange },
            onSourceDrop,
        });
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
        expect(preview.style.pointerEvents).toBe("none");
        expect(preview.style.transform).toContain("translate(");
        expect(preview.hasAttribute("data-over")).toBe(true);
        expect(onLayoutChange).not.toHaveBeenCalled();
        await press.release(...centre(4, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const told = {
            item: expect.objectContaining({ x: 4, y: 0, w: 2, h: 1 }),
            data: { kind: "note" },
            layout: expect.any(Array),
        };
        expect(onDropped).toHaveBeenCalledWith(told);
        expect(onSourceDrop).toHaveBeenCalledWith(told);
        expect(byTestId("preview")).toBeNull();
        expect(grid.hasAttribute("data-dropping")).toBe(false);
        expect(source.hasAttribute("data-dragging")).toBe(false);
        const id = onDropped.mock.calls[0]?.[0].item.id as string;
        expect(byTestId(`item-${id}`)).toBeTruthy();
    });

    it("is a tab stop that grabs from the keyboard, and focuses the item it adds", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        await render(Board, { gridLayoutRef });
        const source = testId("source");
        expect(source.tabIndex).toBe(0);
        expect(source.style.touchAction).toBe("none");
        source.focus();
        await key(source, "Enter");
        expect(source.hasAttribute("data-grabbed")).toBe(true);
        expect(testId("placeholder").getAttribute("data-kind")).toBe("drop");
        await key(source, "ArrowDown");
        await key(source, "Enter");
        const layout = gridLayoutRef.current?.model.get("layout") ?? [];
        expect(layout).toHaveLength(3);
        const added = layout.find((item) => item.id !== "a" && item.id !== "b");
        expect(document.activeElement).toBe(testId(`item-${added?.id}`));
        expect(source.hasAttribute("data-grabbed")).toBe(false);
    });

    it("starts nothing when disabled, and is no tab stop", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        await render(Board, { gridLayoutRef, disabled: true });
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
        const fixture = await render(Board, { gridLayoutRef });
        const press = await pointer(testId("source"), 1300, 500);
        await press.move(...centre(4, 0));
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeDefined();
        await setInput(fixture, "showSource", false);
        expect(gridLayoutRef.current?.engine.get("gesture")).toBeUndefined();
        expect(gridLayoutRef.current?.model.get("layout")).toHaveLength(2);
    });

    it("works inside the root without a ref", async () => {
        stubBrowser();
        const fixture = await render(InnerSource);
        const press = await pointer(testId("inner"), 600, 20);
        await press.move(...centre(6, 0));
        await press.release(...centre(6, 0));
        expect(fixture.componentInstance.dropped).toHaveBeenCalledTimes(1);
    });

    it("throws a clear error outside a root without a ref", () => {
        const fixture = TestBed.createComponent(LooseSource);
        expect(() => fixture.detectChanges()).toThrow(
            /inside \[gridLayoutRoot\], or take a gridLayoutRef/,
        );
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
        await settle();
    }

    it("marks a refused drag, and drops what it accepts with the drop's data", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDropped = vi.fn();
        let accept = false;
        await render(Board, {
            gridLayoutRef,
            options: {
                onDropped,
                externalDrag: (event: DragEvent) =>
                    accept
                        ? {
                              w: 2,
                              h: 1,
                              data: Array.from(
                                  (event.dataTransfer?.files ??
                                      []) as ArrayLike<{
                                      name: string;
                                  }>,
                                  (file) => file.name,
                              ),
                          }
                        : false,
            },
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
        expect(onDropped).toHaveBeenCalledWith(
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
        await render(Board, { gridLayoutRef, options: { onLayoutChange } });
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
        await render(Board, { gridLayoutRef, controlled: true });
        const press = await pointer(testId("source"), 1300, 500);
        await press.move(...centre(4, 0));
        await press.release(...centre(4, 0));
        expect(testId("grid").getAttribute("data-drops")).toBe("1");
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
    it("marks the root and the item, and tells (dragStop) it ended outside", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        const onDragStop = vi.fn();
        await render(Board, { gridLayoutRef, options: { onDragStop } });
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
