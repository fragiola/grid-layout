import { Component, input, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import {
    GRID_LAYOUT,
    type GridLayoutHandle,
    injectGridLayout,
    type Layout,
    veto,
} from "../src/public-api";
import { Grid } from "./grid";
import {
    box,
    cell,
    key,
    maybeBox,
    pointer,
    render,
    setInput,
    settle,
    stubBrowser,
} from "./helpers";

const two: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

/** What the grid inside a root says it is (`injectGridLayout()`). */
let grabbed: Signal<GridLayoutHandle> | undefined;

@Component({ selector: "test-grab", template: "" })
class Grab {
    constructor() {
        grabbed = injectGridLayout();
    }
}

/** A parent that keeps the layout and takes every change: `[(layout)]`. */
@Component({
    selector: "test-controlled",
    imports: [GRID_LAYOUT, Grab],
    template: `
        <div
            gridLayoutRoot
            [width]="1200"
            [rowHeight]="50"
            [gap]="gap"
            [(layout)]="layout"
            (layoutChange)="told($event)"
        >
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.aria-label]="item.id"></div>
            </ng-template>
            <test-grab />
        </div>
    `,
})
class Controlled {
    readonly gap = [10, 10] as const;
    readonly layout = signal<Layout>(two);
    readonly told = (layout: Layout) => {
        this.last = layout;
    };
    last: Layout | undefined;
}

/** A root with the rules of `extra` and a grab of its grid. */
@Component({
    selector: "test-rules",
    imports: [GRID_LAYOUT, Grab],
    template: `
        <div
            gridLayoutRoot
            [width]="1200"
            [rowHeight]="50"
            [defaultLayout]="layout"
            [cols]="extra().cols"
            [allowOverlap]="extra().allowOverlap"
        >
            <test-grab />
        </div>
    `,
})
class Rules {
    readonly layout = two;
    readonly extra = input<{ cols?: number; allowOverlap?: boolean }>({});
}

/** Items of which the first holds a drag handle. */
@Component({
    selector: "test-handled",
    imports: [GRID_LAYOUT],
    template: `
        <div gridLayoutRoot [width]="1200" [rowHeight]="50" [defaultLayout]="layout">
            <ng-template gridLayoutItems let-item>
                <div [gridLayoutItem]="item.id" [attr.aria-label]="item.id">
                    @if (item.id === "a") {
                        <span gridLayoutDragHandle aria-label="grip"></span>
                    }
                </div>
            </ng-template>
        </div>
    `,
})
class Handled {
    readonly layout = two;
}

@Component({
    selector: "test-loose-item",
    imports: [GRID_LAYOUT],
    template: `<div [gridLayoutItem]="'a'"></div>`,
})
class LooseItem {}

@Component({
    selector: "test-loose-handle",
    imports: [GRID_LAYOUT],
    template: `<div gridLayoutRoot [width]="1200"><span gridLayoutDragHandle></span></div>`,
})
class LooseHandle {}

/** A root that appears later, in a view of its own: measured only once it is in the document. */
@Component({
    selector: "test-later",
    imports: [GRID_LAYOUT],
    template: `
        @if (shown()) {
            <div gridLayoutRoot [rowHeight]="50" [defaultLayout]="layout" aria-label="dashboard">
                <ng-template gridLayoutItems let-item>
                    <div [gridLayoutItem]="item.id" [attr.aria-label]="item.id"></div>
                </ng-template>
            </div>
        }
    `,
})
class Later {
    readonly layout = two;
    readonly shown = signal(false);
}

/** A component that reads the grid in its constructor: before the root has its inputs. */
@Component({ selector: "test-early-read", template: "" })
class EarlyRead {
    constructor() {
        injectGridLayout()();
    }
}

@Component({
    selector: "test-early",
    imports: [GRID_LAYOUT, EarlyRead],
    template: `<div gridLayoutRoot><test-early-read /></div>`,
})
class Early {}

/** Every DOM write under `root` while `run` runs, except the engine's own on `except`'s style. */
async function writesDuring(
    root: Element,
    except: Element,
    run: () => Promise<void>,
): Promise<MutationRecord[]> {
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
    });
    await run();
    await settle();
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records.filter(
        (record) =>
            !(record.target === except && record.attributeName === "style"),
    );
}

describe("[gridLayoutRoot]", () => {
    it("renders the items at their boxes, the root as tall as the layout", async () => {
        await render(Grid, { options: { defaultLayout: two } });
        // column 2 starts at 10 + 2 × 99.17, rounded
        expect(box("b").style.transform).toBe("translate(208px, 10px)");
        expect(box("dashboard").style.height).toBe("130px");
        expect(box("dashboard").style.position).toBe("relative");
        expect(box("a").getAttribute("data-grid-layout-part")).toBe("item");
        expect(box("a").getAttribute("data-item-id")).toBe("a");
        expect(box("a").tabIndex).toBe(0);
    });

    it("attaches the engine once the root is in the document: a root shown later is measured at once", async () => {
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
            configurable: true,
            get(this: HTMLElement) {
                return this.isConnected ? 1200 : 0;
            },
        });
        try {
            const fixture = await render(Later);
            fixture.componentInstance.shown.set(true);
            await fixture.whenStable();
            await settle();
            // no resize frame ran: the width is the one measured as the engine attached
            expect(box("b").style.transform).toBe("translate(208px, 10px)");
        } finally {
            delete (HTMLElement.prototype as { clientWidth?: number })
                .clientWidth;
        }
    });

    it("uncontrolled: a drop stands, and (layoutChange) is told once (react-grid-layout#1984)", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        const onLayoutsChange = vi.fn();
        await render(Grid, {
            options: { defaultLayout: two, onLayoutChange, onLayoutsChange },
        });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(cell(0, 0)[0] + 8, cell(0, 0)[1]);
        await press.move(...cell(2, 0));
        expect(onLayoutChange).not.toHaveBeenCalled();
        await press.release(...cell(2, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutsChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 2, y: 0, w: 2, h: 2 },
            { id: "b", x: 2, y: 2, w: 2, h: 2 },
        ]);
        expect(onLayoutsChange.mock.calls[0]?.[0]).toEqual({
            default: onLayoutChange.mock.calls[0]?.[0],
        });
    });

    it("controlled: a parent that ignores the change keeps the items where they were", async () => {
        stubBrowser();
        const onLayoutChange = vi.fn();
        await render(Grid, { options: { layout: two, onLayoutChange } });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 0));
        await press.release(...cell(2, 0));
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("controlled: [(layout)] renders the change", async () => {
        stubBrowser();
        const fixture = await render(Controlled);
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 0));
        await press.release(...cell(2, 0));
        expect(box("b").style.transform).toBe("translate(208px, 130px)");
        expect(fixture.componentInstance.layout()).toEqual([
            { id: "a", x: 2, y: 0, w: 2, h: 2 },
            { id: "b", x: 2, y: 2, w: 2, h: 2 },
        ]);
    });

    it("controlled: tells layouts the parent owns, which it may change in place", async () => {
        const fixture = await render(Controlled);
        const model = grabbed?.().model;
        model?.run("item.move", { itemId: "a", x: 4, y: 0 });
        await settle();
        const told = fixture.componentInstance.last;
        expect(told).toBeDefined();
        expect(told).not.toBe(model?.get("layout"));
        expect(() => structuredClone(told)).not.toThrow();
        // the parent changing its own layout in place never reaches the committed one
        const first = fixture.componentInstance.layout()[0] as { w: number };
        first.w = 9;
        expect(model?.get("layout").find((item) => item.id === "a")?.w).toBe(2);
    });

    it("tells a corrected layout on mount, and nothing for a valid one", async () => {
        const onLayoutChange = vi.fn();
        const valid = await render(Grid, {
            options: { defaultLayout: two, onLayoutChange },
        });
        expect(onLayoutChange).not.toHaveBeenCalled();
        valid.destroy();
        const onLayoutsChange = vi.fn();
        await render(Grid, {
            options: {
                defaultLayout: [{ id: "a", x: 20, y: 5, w: 2, h: 2 }],
                onLayoutChange,
                onLayoutsChange,
            },
        });
        expect(onLayoutChange).toHaveBeenCalledWith([
            { id: "a", x: 10, y: 0, w: 2, h: 2 },
        ]);
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutsChange).toHaveBeenCalledWith({
            default: expect.any(Array),
        });
    });

    it("writes nothing to the page while a drag stays over one cell (D8)", async () => {
        stubBrowser();
        await render(Grid, { options: { defaultLayout: two } });
        const held = box("a");
        const press = await pointer(held, ...cell(0, 0));
        await press.move(cell(0, 0)[0] + 10, cell(0, 0)[1]);
        const writes = await writesDuring(box("dashboard"), held, async () => {
            for (let dx = 12; dx < 40; dx += 4)
                await press.move(cell(0, 0)[0] + dx, cell(0, 0)[1]);
        });
        expect(writes).toEqual([]);
        const moved = await writesDuring(box("dashboard"), held, () =>
            press.move(...cell(2, 0)),
        );
        expect(moved.length).toBeGreaterThan(0);
        await press.release(...cell(2, 0));
    });

    it("never writes back the held item's geometry, which the engine writes during a gesture (D8)", async () => {
        stubBrowser();
        await render(Grid, { options: { defaultLayout: two } });
        const held = box("a");
        const press = await pointer(held, ...cell(0, 0));
        await press.move(cell(0, 0)[0] + 10, cell(0, 0)[1]);
        // the preview changes: the other item moves, the placeholder too, Angular renders
        press.moveNow(...cell(2, 1));
        const engine = held.style.transform;
        expect(engine).not.toBe("translate(10px, 10px)");
        await settle();
        // compacted up: the item would land at column 2, row 0, and b below it
        expect(box("placeholder").style.transform).toBe(
            "translate(208px, 10px)",
        );
        expect(box("b").style.transform).toBe("translate(208px, 130px)");
        expect(held.style.transform).toBe(engine);
        expect(held.style.zIndex).toBe("1");
        await press.release(...cell(2, 1));
        expect(held.style.transform).toBe("translate(208px, 10px)");
        expect(held.style.zIndex).toBe("");
    });

    it("never writes back the size the engine gives an item it resizes (D8)", async () => {
        stubBrowser();
        await render(Grid, { options: { defaultLayout: two } });
        const held = box("a");
        const press = await pointer(box("resize a"), ...cell(1, 1));
        press.moveNow(...cell(3, 3));
        const width = held.style.width;
        expect(width).not.toBe("188px");
        await settle();
        expect(held.hasAttribute("data-resizing")).toBe(true);
        expect(held.style.width).toBe(width);
        await press.release(...cell(3, 3));
        expect(held.style.width).not.toBe("188px");
        expect(held.hasAttribute("data-resizing")).toBe(false);
    });

    it("shows the placeholder only during a gesture, and the gesture's data on the root", async () => {
        stubBrowser();
        await render(Grid, { options: { defaultLayout: two } });
        expect(maybeBox("placeholder")).toBeNull();
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(1, 1));
        expect(box("placeholder").getAttribute("data-kind")).toBe("move");
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(true);
        expect(box("a").hasAttribute("data-dragging")).toBe(true);
        await press.release(...cell(1, 1));
        expect(maybeBox("placeholder")).toBeNull();
        expect(box("dashboard").hasAttribute("data-dragging")).toBe(false);
    });

    it("tells the gestures through its outputs", async () => {
        stubBrowser();
        const onDragStart = vi.fn();
        const onDragMove = vi.fn();
        const onDragStop = vi.fn();
        await render(Grid, {
            options: {
                defaultLayout: two,
                onDragStart,
                onDragMove,
                onDragStop,
            },
        });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(1, 0));
        await press.release(...cell(1, 0));
        expect(onDragStart).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag-start", itemId: "a" }),
        );
        expect(onDragMove).toHaveBeenCalledWith(
            expect.objectContaining({ type: "drag" }),
        );
        expect(onDragStop).toHaveBeenCalledTimes(1);
    });

    it("lets the app veto a press with preventDefault, its listener first", async () => {
        stubBrowser();
        const onDragStart = vi.fn();
        await render(Grid, {
            options: {
                defaultLayout: two,
                onDragStart,
                onPointerDown: (event: PointerEvent) => event.preventDefault(),
            },
        });
        const press = await pointer(box("a"), ...cell(0, 0));
        await press.move(...cell(2, 1));
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("grabs and drops with the keyboard", async () => {
        const onLayoutChange = vi.fn();
        await render(Grid, { options: { defaultLayout: two, onLayoutChange } });
        await key(box("b"), " ");
        expect(box("b").hasAttribute("data-grabbed")).toBe(true);
        expect(box("dashboard").hasAttribute("data-grabbed")).toBe(true);
        await key(box("b"), "ArrowLeft");
        await key(box("b"), "ArrowLeft");
        await key(box("b"), "Enter");
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
        expect(box("b").hasAttribute("data-grabbed")).toBe(false);
    });

    it("cancels a keyboard grab with Escape, restoring the layout", async () => {
        const onLayoutChange = vi.fn();
        await render(Grid, { options: { defaultLayout: two, onLayoutChange } });
        await key(box("b"), "Enter");
        await key(box("b"), "ArrowRight");
        await key(box("b"), "Escape");
        expect(onLayoutChange).not.toHaveBeenCalled();
        expect(box("b").style.transform).toBe("translate(208px, 10px)");
    });

    it("lets the model's commands move the rendered items, and middleware refuse them", async () => {
        await render(Controlled);
        const model = grabbed?.().model;
        model?.run("item.move", { itemId: "b", x: 0, y: 0 });
        await settle();
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
        model?.use(() => veto());
        model?.run("item.move", { itemId: "b", x: 4, y: 0 });
        await settle();
        expect(box("b").style.transform).toBe("translate(10px, 10px)");
    });

    it("re-settles when a rule changes, and tells it", async () => {
        const onLayoutChange = vi.fn();
        const fixture = await render(Grid, {
            options: { defaultLayout: two, onLayoutChange },
        });
        await setInput(fixture, "options", {
            defaultLayout: two,
            onLayoutChange,
            cols: 2,
        });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange.mock.calls[0]?.[0]).toEqual([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
            { id: "b", x: 0, y: 2, w: 2, h: 2 },
        ]);
    });

    it("tells nothing when only a rule changes and no item moves, and a map written again configures nothing", async () => {
        const onLayoutChange = vi.fn();
        const options = { defaultLayout: two, onLayoutChange };
        const fixture = await render(Grid, {
            options: { ...options, cols: { default: 12 } },
        });
        await setInput(fixture, "options", {
            ...options,
            cols: { default: 12 },
            preventCollision: true,
        });
        await setInput(fixture, "options", {
            ...options,
            cols: { default: 12 },
            preventCollision: true,
        });
        expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("sets dir on the root and mirrors in right-to-left", async () => {
        await render(Grid, {
            options: {
                defaultLayout: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
                dir: "rtl",
            },
        });
        expect(box("dashboard").getAttribute("dir")).toBe("rtl");
        // 1200 − 10 − the item's 188px width
        expect(box("a").style.transform).toBe("translate(1002px, 10px)");
    });

    it("moves with the visual arrows in right-to-left", async () => {
        const onLayoutChange = vi.fn();
        await render(Grid, {
            options: {
                defaultLayout: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
                dir: "rtl",
                onLayoutChange,
            },
        });
        await key(box("a"), " ");
        // in right-to-left, ArrowLeft moves toward the inline end: one column further
        await key(box("a"), "ArrowLeft");
        await key(box("a"), "Enter");
        expect(onLayoutChange.mock.calls.at(-1)?.[0][0]).toMatchObject({
            x: 1,
        });
    });

    it("hides a resize handle while its item cannot be resized", async () => {
        const fixture = await render(Grid, {
            options: {
                defaultLayout: [
                    { id: "a", x: 0, y: 0, w: 2, h: 2, static: true },
                    two[1],
                ],
            },
        });
        expect(maybeBox("resize a")).toBeNull();
        expect(box("resize b").getAttribute("data-side")).toBe("bottom-end");
        expect(box("resize b").style.touchAction).toBe("none");
        await setInput(fixture, "options", {
            defaultLayout: two,
            resizable: false,
        });
        expect(maybeBox("resize b")).toBeNull();
    });

    it("moves the tab stop to a drag handle, once it is rendered", async () => {
        await render(Handled);
        expect(box("a").tabIndex).toBe(-1);
        expect(box("grip").tabIndex).toBe(0);
        expect(box("grip").getAttribute("data-grid-layout-part")).toBe(
            "drag-handle",
        );
        expect(box("grip").style.touchAction).toBe("none");
        expect(box("b").tabIndex).toBe(0);
    });

    it("applies a controlled layout that must be corrected once, and tells it once", async () => {
        const onLayoutChange = vi.fn();
        const messy: Layout = [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const fixture = await render(Grid, {
            options: { layout: messy, onLayoutChange },
        });
        await setInput(fixture, "options", {
            layout: messy,
            onLayoutChange,
            cols: 12,
        });
        await setInput(fixture, "options", {
            layout: messy,
            onLayoutChange,
            cols: 12,
            preventCollision: false,
        });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(onLayoutChange).toHaveBeenCalledWith([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
        ]);
        expect(box("a").style.transform).toBe("translate(10px, 10px)");
    });

    it("tells a new prop that has to be corrected, even when the grid already shows it", async () => {
        const onLayoutChange = vi.fn();
        const messy = (): Layout => [{ id: "a", x: 0, y: 5, w: 2, h: 2 }];
        const fixture = await render(Grid, {
            options: { layout: messy(), onLayoutChange },
        });
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        await setInput(fixture, "options", { layout: messy(), onLayoutChange });
        expect(onLayoutChange).toHaveBeenCalledTimes(2);
        expect(onLayoutChange).toHaveBeenLastCalledWith([
            { id: "a", x: 0, y: 0, w: 2, h: 2 },
        ]);
    });

    it("throws the same error for an invalid layout as React's", () => {
        const fixture = TestBed.createComponent(Grid);
        fixture.componentRef.setInput("options", {
            layout: [{ id: "a", x: 0, y: 0, w: 0, h: 1 }] as Layout,
        });
        expect(() => fixture.detectChanges()).toThrow(/invalid layout/);
    });

    it("goes back to a rule's default when its input is removed", async () => {
        const fixture = await render(Rules, {
            extra: { cols: 3, allowOverlap: true },
        });
        expect(grabbed?.().model.state).toMatchObject({
            cols: 3,
            allowOverlap: true,
        });
        await setInput(fixture, "extra", {});
        expect(grabbed?.().model.state).toMatchObject({
            cols: 12,
            allowOverlap: false,
        });
    });

    it("throws a clear error for a part outside a root or an item", () => {
        expect(() => TestBed.createComponent(LooseItem)).toThrow(
            /\[gridLayoutItem\] must be used inside \[gridLayoutRoot\]/,
        );
        const fixture = TestBed.createComponent(LooseHandle);
        expect(() => fixture.detectChanges()).toThrow(
            /\[gridLayoutDragHandle\] must be used inside \[gridLayoutItem\]/,
        );
    });

    it("throws a clear error for the grid read before the root's inputs are set", () => {
        expect(() => TestBed.createComponent(Early)).toThrow(
            /once they are set: read it in an effect, a computed or a handler/,
        );
    });
});
