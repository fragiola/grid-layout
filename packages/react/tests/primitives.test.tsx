import type { Layout } from "@fragiola/grid-layout";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GridLayout } from "../src";
import { cell, GEOMETRY, pointer, stubBrowser } from "./helpers";

// The primitive contract (D4, D5): structural inline style only, state as data-* (present or
// absent), no text, no names, no roles, no class names, and the consumer's props forwarded.

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

function Everything() {
    return (
        <GridLayout.Root {...GEOMETRY} defaultLayout={layout}>
            <GridLayout.Items>
                {(item) => (
                    <GridLayout.Item itemId={item.id}>
                        <GridLayout.DragHandle />
                        <GridLayout.ResizeHandle side="end" />
                        <GridLayout.ResizeHandle side="bottom-start" />
                    </GridLayout.Item>
                )}
            </GridLayout.Items>
            <GridLayout.Placeholder />
        </GridLayout.Root>
    );
}

function parts(container: HTMLElement): HTMLElement[] {
    return [
        ...container.querySelectorAll<HTMLElement>("[data-grid-layout-part]"),
    ];
}

describe("the primitives", () => {
    it("set only structural inline style, during a gesture too", () => {
        stubBrowser();
        const { container } = render(<Everything />);
        const press = pointer(
            container.querySelector(
                '[data-grid-layout-part="drag-handle"]',
            ) as Element,
            ...cell(0, 0),
        );
        press.move(...cell(1, 1));
        const all = parts(container);
        expect(
            all.map((element) => element.dataset.gridLayoutPart).sort(),
        ).toEqual(
            [
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
        for (const element of all) {
            for (let i = 0; i < element.style.length; i++) {
                const property = element.style.item(i);
                expect(
                    STRUCTURAL.has(property),
                    `${element.dataset.gridLayoutPart}: ${property}`,
                ).toBe(true);
            }
        }
        press.release(...cell(1, 1));
    });

    it("render no text, no names, no roles and no class names", () => {
        const { container } = render(<Everything />);
        expect(container.textContent).toBe("");
        for (const element of parts(container)) {
            expect(element.getAttribute("aria-label")).toBeNull();
            expect(element.getAttribute("role")).toBeNull();
            expect(element.getAttribute("class")).toBeNull();
            for (const attribute of element.getAttributeNames()) {
                if (attribute.startsWith("data-")) {
                    expect(element.getAttribute(attribute)).not.toBe("false");
                }
            }
        }
    });

    it("forward the consumer's props, class names and styles, structural keys winning", () => {
        const { container } = render(
            <GridLayout.Root
                {...GEOMETRY}
                defaultLayout={layout}
                id="board"
                className={(state) => (state.dragging ? "moving" : "still")}
                style={{ position: "static", background: "red" }}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            render={<section />}
                            className={(state) =>
                                state.static ? "pinned" : "free"
                            }
                            style={{ transform: "none", color: "blue" }}
                        />
                    )}
                </GridLayout.Items>
            </GridLayout.Root>,
        );
        const root = container.querySelector("#board") as HTMLElement;
        expect(root.className).toBe("still");
        expect(root.style.position).toBe("relative");
        expect(root.style.background).toBe("red");
        const items = container.querySelectorAll("section");
        expect([...items].map((element) => element.className)).toEqual([
            "free",
            "pinned",
        ]);
        expect((items[0] as HTMLElement).style.transform).toBe(
            "translate(10px, 10px)",
        );
        expect((items[0] as HTMLElement).style.color).toBe("blue");
    });

    it("ship no CSS file and set no CSS variable", () => {
        const { container } = render(<Everything />);
        for (const element of parts(container)) {
            expect(element.getAttribute("style") ?? "").not.toMatch(/--/);
        }
    });
});
