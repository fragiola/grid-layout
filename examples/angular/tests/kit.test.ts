// @vitest-environment jsdom

import { Component, signal, type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { createGridLayoutModel } from "@fragiola/grid-layout-angular";
import { afterEach, describe, expect, it } from "vitest";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";
import {
    createAnnouncer,
    describeGesture,
} from "../src/examples/_kit/announce";
import { Artwork } from "../src/examples/_kit/artwork";
import { pointerOver } from "../src/examples/_kit/hit";
import { forget, load, save } from "../src/examples/_kit/storage";
import { stow, unstow } from "../src/examples/_kit/toolbox";
import { createUndoHistory, undoKey } from "../src/examples/_kit/undo";

// The Angular kit renders what the React kit renders: the same element, role, state attributes and
// classes, so the shared e2e specs and the themes read both the same. The framework-free kit files
// are React's, byte for byte (tests/vendored.test.ts): their logic is checked here once.

afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = "";
    localStorage.clear();
});

/** Renders `component` and returns its element, once stable. */
async function render<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return {
        root: fixture.nativeElement as HTMLElement,
        fixture,
        stable: () => fixture.whenStable(),
    };
}

const classes = (element: Element | null) =>
    element?.getAttribute("class")?.split(/\s+/) ?? [];

describe("the Angular UI kit", () => {
    it("Clickable.Button is a button with the clickable classes", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable variant="outline" size="sm" aria-label="Add" [class]="'extra'">Add</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        const button = root.querySelector("button");
        expect(button?.getAttribute("type")).toBe("button");
        expect(button?.getAttribute("aria-label")).toBe("Add");
        expect(button?.getAttribute("data-slot")).toBe("clickable-button");
        expect(classes(button)).toEqual(
            expect.arrayContaining([
                "border-palette-line",
                "h-8",
                "px-3",
                "extra",
            ]),
        );
    });

    it("Clickable.Button takes a type, for a form's submit", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable type="submit">Save</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        expect(root.querySelector("button")?.getAttribute("type")).toBe(
            "submit",
        );
    });

    it("a disabled Clickable.Button is disabled and dimmed", async () => {
        @Component({
            imports: [ClickableButton],
            template: `<button kitClickable disabled>Save</button>`,
        })
        class Host {}
        const { root } = await render(Host);
        const button = root.querySelector("button");
        expect(button?.disabled).toBe(true);
        expect(classes(button)).toContain("opacity-50");
    });

    it("Switch is a switch that marks its checked state as Base UI does, and binds both ways", async () => {
        @Component({
            imports: [SWITCH],
            template: `
                <button kitSwitch [(checked)]="on" aria-labelledby="label"><span kitSwitchThumb></span></button>
                <span id="label">Bounded</span>
            `,
        })
        class Host {
            readonly on = signal(true);
        }
        const { root, fixture, stable } = await render(Host);
        const button = root.querySelector("button");
        const thumb = root.querySelector("[kitSwitchThumb]");
        expect(button?.getAttribute("role")).toBe("switch");
        expect(button?.getAttribute("type")).toBe("button");
        expect(button?.getAttribute("aria-checked")).toBe("true");
        expect(button?.hasAttribute("data-checked")).toBe(true);
        expect(thumb?.hasAttribute("data-checked")).toBe(true);
        expect(classes(button)).toContain("data-checked:bg-palette-ring");
        expect(classes(thumb)).toContain("data-checked:translate-x-3");

        button?.click();
        await stable();
        expect(fixture.componentInstance.on()).toBe(false);
        expect(button?.getAttribute("aria-checked")).toBe("false");
        expect(button?.hasAttribute("data-checked")).toBe(false);
        expect(thumb?.hasAttribute("data-checked")).toBe(false);
    });
});

describe("the Angular _kit", () => {
    it("Artwork is a decorative svg, one path per layer with its class", async () => {
        @Component({
            imports: [Artwork],
            template: `<svg kitArtwork [seed]="3" [ratio]="1.5" [layers]="layers" [class]="'picture'"></svg>`,
        })
        class Host {
            readonly layers = {
                sky: "fill-a",
                sun: "fill-b",
                far: "fill-c",
                near: "fill-d",
            };
        }
        const { root } = await render(Host);
        const svg = root.querySelector("svg");
        expect(svg?.getAttribute("aria-hidden")).toBe("true");
        expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice");
        expect(svg?.getAttribute("viewBox")).toMatch(/^0 0 \d+(\.\d+)? \d+/);
        expect(classes(svg)).toContain("picture");
        const paths = [...(svg?.querySelectorAll("path") ?? [])];
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
            // an SVG element, not an HTML one: the browser draws it
            expect(path.namespaceURI).toBe("http://www.w3.org/2000/svg");
            expect(path.getAttribute("d")).toBeTruthy();
            expect(["fill-a", "fill-b", "fill-c", "fill-d"]).toContain(
                path.getAttribute("class"),
            );
        }
    });

    it("createAnnouncer keeps the last message worth saying", () => {
        const [message, announce] = createAnnouncer();
        expect(message()).toBe("");
        announce(
            describeGesture(
                {
                    type: "drop",
                    source: "keyboard",
                    before: { x: 0, y: 0, w: 2, h: 2 },
                    item: { x: 3, y: 1, w: 2, h: 2 },
                },
                "Sales",
            ),
        );
        expect(message()).toBe(
            "Sales dropped at column 4, row 2, 2 columns wide, 2 rows tall.",
        );
        announce(undefined);
        expect(message()).toContain("Sales dropped");
    });

    it("the undo history steps back and forward through committed layouts", () => {
        const model = createGridLayoutModel({
            layout: [
                { id: "a", x: 0, y: 0, w: 2, h: 2 },
                { id: "b", x: 2, y: 0, w: 2, h: 2 },
            ],
        });
        const history = createUndoHistory(model);
        let told = 0;
        history.subscribe(() => told++);
        expect(history.getSnapshot()).toMatchObject({
            canUndo: false,
            canRedo: false,
        });

        model.run("item.move", { itemId: "a", x: 6, y: 0 });
        expect(history.getSnapshot().undoSteps).toEqual([
            { command: "item.move", itemId: "a" },
        ]);
        expect(history.undo()).toBe(true);
        expect(model.get("layout").find((i) => i.id === "a")?.x).toBe(0);
        expect(history.getSnapshot()).toMatchObject({
            canUndo: false,
            canRedo: true,
        });
        expect(history.redo()).toBe(true);
        expect(model.get("layout").find((i) => i.id === "a")?.x).toBe(6);
        expect(history.redo()).toBe(false);
        expect(told).toBe(3);

        history.dispose();
        model.run("item.move", { itemId: "b", x: 8, y: 0 });
        expect(history.getSnapshot().undoSteps).toHaveLength(1);
    });

    it("undoKey reads Ctrl/Cmd+Z and Ctrl/Cmd+Y, never inside a text field", () => {
        const key = (init: KeyboardEventInit, target: EventTarget | null) => ({
            key: init.key ?? "",
            ctrlKey: init.ctrlKey ?? false,
            metaKey: init.metaKey ?? false,
            shiftKey: init.shiftKey ?? false,
            target,
        });
        const div = document.createElement("div");
        const input = document.createElement("input");
        expect(undoKey(key({ key: "z", ctrlKey: true }, div))).toBe("undo");
        expect(
            undoKey(key({ key: "Z", metaKey: true, shiftKey: true }, div)),
        ).toBe("redo");
        expect(undoKey(key({ key: "y", ctrlKey: true }, div))).toBe("redo");
        expect(undoKey(key({ key: "z" }, div))).toBeUndefined();
        expect(
            undoKey(key({ key: "z", ctrlKey: true }, input)),
        ).toBeUndefined();
    });

    it("storage saves, loads and forgets, and never throws", () => {
        expect(load("kit")).toBeUndefined();
        expect(save("kit", { cols: 12 })).toBe(true);
        expect(load("kit")).toEqual({ cols: 12 });
        forget("kit");
        expect(load("kit")).toBeUndefined();
        localStorage.setItem("kit", "{not json");
        expect(load("kit")).toBeUndefined();
    });

    it("the toolbox keeps each widget once, newest first, with its size", () => {
        const one = stow([], { id: "a", w: 2, h: 1 });
        const two = stow(one, { id: "b", w: 4, h: 2 });
        expect(stow(two, { id: "a", w: 3, h: 3 })).toEqual([
            { id: "a", w: 3, h: 3 },
            { id: "b", w: 4, h: 2 },
        ]);
        expect(unstow(two, "a")).toEqual([{ id: "b", w: 4, h: 2 }]);
    });

    it("pointerOver says whether a pointer event is inside a box", () => {
        const trash = document.createElement("div");
        trash.getBoundingClientRect = () =>
            ({ left: 10, right: 50, top: 10, bottom: 30 }) as DOMRect;
        const at = (x: number, y: number) =>
            new MouseEvent("pointermove", { clientX: x, clientY: y });
        expect(pointerOver(trash, at(20, 20))).toBe(true);
        expect(pointerOver(trash, at(60, 20))).toBe(false);
        expect(pointerOver(trash, undefined)).toBe(false);
        expect(pointerOver(null, at(20, 20))).toBe(false);
    });
});
