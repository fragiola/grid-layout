import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    type GridLayoutRef,
    injectDragHandle,
    injectItem,
    injectResizeHandle,
    type Layout,
} from "../src/public-api";
import { cell, pointer, render, stubBrowser } from "./helpers";

// The primitive contract (D4, D5): structural inline style only, state as data-* (present or
// absent), no text, no names, no roles, no class names of their own, and the app's own
// attributes, classes and styles kept on its elements.

const STRUCTURAL = new Set([
    "position",
    "top",
    "left",
    "width",
    "height",
    "transform",
    "box-sizing",
    "z-index",
    "touch-action",
    "pointer-events",
]);

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "s", x: 2, y: 0, w: 2, h: 1, static: true },
];

/** Every part, with nothing of the app's: no text, no attribute, no class. */
@Component({
    selector: "test-everything",
    imports: [GRID_LAYOUT],
    template: `<div gridLayoutRoot [width]="1200" [rowHeight]="50" [gap]="gap" [defaultLayout]="layout" [gridLayoutRef]="gridLayoutRef()"><ng-template gridLayoutItems let-item><div [gridLayoutItem]="item.id"><span gridLayoutDragHandle></span><div *gridLayoutResizeHandle="'end'"></div><div *gridLayoutResizeHandle="'bottom-start'"></div></div></ng-template><div *gridLayoutPlaceholder></div><div *gridLayoutCells="let cell; rows: 1"></div></div>`,
})
class Everything {
    readonly gap = [10, 10] as const;
    readonly layout = layout;
    readonly gridLayoutRef = input<GridLayoutRef | undefined>(undefined);
}

/** A drag source and a drag preview outside the root, through its ref. */
@Component({
    selector: "test-outside",
    imports: [GRID_LAYOUT, Everything],
    template: `<div [gridLayoutDragSource]="{ w: 1, h: 1 }" [gridLayoutRef]="gridLayoutRef"></div><div *gridLayoutDragPreview="gridLayoutRef"></div><test-everything [gridLayoutRef]="gridLayoutRef" />`,
})
class Outside {
    readonly gridLayoutRef = createGridLayoutRef();
}

/** The app's attributes, classes and styles on the parts' elements, and state-dependent ones. */
@Component({
    selector: "test-styled",
    imports: [GRID_LAYOUT],
    template: `
        <div
            gridLayoutRoot
            id="board"
            class="board"
            style="position: static; background: red"
            [width]="1200"
            [rowHeight]="50"
            [defaultLayout]="layout"
        >
            <ng-template gridLayoutItems let-item>
                <section
                    [gridLayoutItem]="item.id"
                    #part="gridLayoutItem"
                    [attr.data-testid]="item.id"
                    [class.pinned]="part.state().static"
                    [class.free]="!part.state().static"
                    style="transform: none; color: blue"
                ></section>
            </ng-template>
        </div>
    `,
})
class Styled {
    readonly layout = layout;
}

/** What a component inside a part reads of it. */
let read: Record<string, unknown> = {};

@Component({ selector: "test-item-probe", template: "" })
class ItemProbe {
    readonly item = injectItem();
    constructor() {
        read.item = this.item.state;
    }
}

@Component({ selector: "test-handle-probe", template: "" })
class HandleProbe {
    constructor() {
        read.handle = injectDragHandle().state;
    }
}

@Component({ selector: "test-resize-probe", template: "" })
class ResizeProbe {
    constructor() {
        read.resize = injectResizeHandle().state;
    }
}

@Component({
    selector: "test-probed",
    imports: [GRID_LAYOUT, ItemProbe, HandleProbe, ResizeProbe],
    template: `<div gridLayoutRoot [width]="1200" [rowHeight]="50" [defaultLayout]="layout"><ng-template gridLayoutItems let-item><div [gridLayoutItem]="item.id"><test-item-probe /><span gridLayoutDragHandle><test-handle-probe /></span><div *gridLayoutResizeHandle="'end'"><test-resize-probe /></div></div></ng-template></div>`,
})
class Probed {
    readonly layout: Layout = [layout[0] as Layout[number]];
}

@Component({
    selector: "test-misused",
    imports: [GRID_LAYOUT],
    template: `<div gridLayoutRoot><div gridLayoutPlaceholder></div></div>`,
})
class Misused {}

function parts(): HTMLElement[] {
    return [
        ...document.querySelectorAll<HTMLElement>("[data-grid-layout-part]"),
    ];
}

function expectStructural(elements: HTMLElement[]): void {
    for (const element of elements) {
        for (let i = 0; i < element.style.length; i++) {
            const property = element.style.item(i);
            expect(
                STRUCTURAL.has(property),
                `${element.dataset.gridLayoutPart}: ${property}`,
            ).toBe(true);
        }
    }
}

describe("the primitives", () => {
    it("set only structural inline style, during a gesture too", async () => {
        stubBrowser();
        await render(Everything);
        const press = await pointer(
            document.querySelector(
                '[data-grid-layout-part="drag-handle"]',
            ) as Element,
            ...cell(0, 0),
        );
        await press.move(...cell(1, 1));
        const all = parts();
        expect(
            all.map((element) => element.dataset.gridLayoutPart).sort(),
        ).toEqual(
            [
                ...Array.from({ length: 12 }, () => "cell"),
                "drag-handle",
                "drag-handle",
                "item",
                "item",
                "placeholder",
                "resize-handle",
                "resize-handle",
                "root",
            ].sort(),
        );
        expectStructural(all);
        await press.release(...cell(1, 1));
    });

    it("render no text, no names, no roles and no class names, and boolean data-* present or absent", async () => {
        await render(Everything);
        expect(document.body.textContent?.trim()).toBe("");
        for (const element of parts()) {
            expect(element.getAttribute("aria-label")).toBeNull();
            expect(element.getAttribute("role")).toBeNull();
            expect(element.getAttribute("class")).toBeNull();
            for (const attribute of element.getAttributeNames()) {
                if (attribute.startsWith("data-")) {
                    expect(element.getAttribute(attribute)).not.toBe("false");
                }
            }
        }
        const item = document.querySelector(
            '[data-item-id="a"]',
        ) as HTMLElement;
        expect(item.getAttribute("data-draggable")).toBe("");
        expect(item.hasAttribute("data-static")).toBe(false);
        const pinned = document.querySelector(
            '[data-item-id="s"]',
        ) as HTMLElement;
        expect(pinned.getAttribute("data-static")).toBe("");
        expect(pinned.hasAttribute("data-draggable")).toBe(false);
    });

    it("keep the app's attributes, classes and styles on its elements, structural keys winning, its bindings reading the part's state", async () => {
        await render(Styled);
        const root = document.querySelector("#board") as HTMLElement;
        expect(root.className).toBe("board");
        expect(root.style.position).toBe("relative");
        expect(root.style.background).toBe("red");
        const free = document.querySelector('[data-testid="a"]') as HTMLElement;
        expect(free.tagName).toBe("SECTION");
        expect(free.className).toBe("free");
        expect(free.style.transform).toBe("translate(10px, 10px)");
        expect(free.style.color).toBe("blue");
        const pinned = document.querySelector(
            '[data-testid="s"]',
        ) as HTMLElement;
        expect(pinned.className).toBe("pinned");
        expect(pinned.dataset.gridLayoutPart).toBe("item");
        expect(pinned.hasAttribute("data-static")).toBe(true);
    });

    it("hand their state to a component inside them", async () => {
        read = {};
        await render(Probed);
        const state = (name: string) =>
            (read[name] as (() => Record<string, unknown>) | undefined)?.();
        expect(state("item")).toMatchObject({
            itemId: "a",
            handled: true,
            draggable: true,
        });
        expect(state("handle")).toMatchObject({
            itemId: "a",
            draggable: true,
        });
        expect(state("resize")).toMatchObject({
            itemId: "a",
            side: "end",
            resizable: true,
        });
    });

    it("a drag source and a drag preview set only structural style, and no text, during a drop", async () => {
        stubBrowser();
        await render(Outside);
        const source = document.querySelector(
            '[data-grid-layout-part="drag-source"]',
        ) as Element;
        const press = await pointer(source, 1300, 500);
        await press.move(...cell(6, 0));
        const all = parts();
        expect(all.map((element) => element.dataset.gridLayoutPart)).toContain(
            "drag-preview",
        );
        for (const element of all) {
            expect(element.getAttribute("aria-label")).toBeNull();
            expect(element.getAttribute("role")).toBeNull();
        }
        expectStructural(all);
        expect(document.body.textContent?.trim()).toBe("");
        await press.release(...cell(6, 0));
    });

    it("ship no CSS file and set no CSS variable", async () => {
        await render(Everything);
        for (const element of parts()) {
            expect(element.getAttribute("style") ?? "").not.toMatch(/--/);
        }
    });

    it("say how to use a part template put on an element", () => {
        expect(() => TestBed.createComponent(Misused)).toThrow(
            /\[gridLayoutPlaceholder\] goes on an ng-template/,
        );
    });
});
