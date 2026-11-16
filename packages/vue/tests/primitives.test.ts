import type { Layout } from "@fragiola/grid-layout";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { createGridLayoutRef, GridLayout, type GridLayoutRef } from "../src";
import {
    cell,
    GEOMETRY,
    mountInDocument,
    pointer,
    stubBrowser,
} from "./helpers";

// The primitive contract (D4, D5): structural inline style only, state as data-* (present or
// absent), no text, no names, no roles, no class names, and the consumer's attributes forwarded.

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

const Everything = defineComponent({
    props: {
        gridLayoutRef: {
            type: Object as PropType<GridLayoutRef>,
            default: undefined,
        },
    },
    setup(props) {
        return () =>
            h(
                GridLayout.Root,
                {
                    ...GEOMETRY,
                    defaultLayout: layout,
                    gridLayoutRef: props.gridLayoutRef,
                },
                {
                    default: () => [
                        h(GridLayout.Items, null, {
                            default: ({ item }: { item: { id: string } }) =>
                                h(
                                    GridLayout.Item,
                                    { itemId: item.id },
                                    {
                                        default: () => [
                                            h(GridLayout.DragHandle),
                                            h(GridLayout.ResizeHandle, {
                                                side: "end",
                                            }),
                                            h(GridLayout.ResizeHandle, {
                                                side: "bottom-start",
                                            }),
                                        ],
                                    },
                                ),
                        }),
                        h(GridLayout.Placeholder),
                        h(GridLayout.Cells, { rows: 1 }),
                    ],
                },
            );
    },
});

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
        mountInDocument(Everything);
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

    it("render no text, no names, no roles and no class names", () => {
        mountInDocument(Everything);
        expect(document.body.textContent).toBe("");
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
    });

    it("forward the consumer's attributes, classes and styles, structural keys winning; `as` and the render slot replace the element", () => {
        mountInDocument(
            defineComponent({
                setup: () => () =>
                    h(
                        GridLayout.Root,
                        {
                            ...GEOMETRY,
                            defaultLayout: layout,
                            id: "board",
                            class: "board",
                            style: { position: "static", background: "red" },
                        },
                        {
                            default: () =>
                                h(GridLayout.Items, null, {
                                    default: ({
                                        item,
                                    }: {
                                        item: { id: string };
                                    }) =>
                                        item.id === "a"
                                            ? h(GridLayout.Item, {
                                                  itemId: item.id,
                                                  as: "section",
                                                  class: "free",
                                                  style: {
                                                      transform: "none",
                                                      color: "blue",
                                                  },
                                              })
                                            : h(
                                                  GridLayout.Item,
                                                  { itemId: item.id },
                                                  {
                                                      render: ({
                                                          props,
                                                          state,
                                                      }: {
                                                          props: Record<
                                                              string,
                                                              unknown
                                                          >;
                                                          state: {
                                                              static: boolean;
                                                          };
                                                      }) => [
                                                          h("article", {
                                                              ...props,
                                                              class: state.static
                                                                  ? "pinned"
                                                                  : "free",
                                                          }),
                                                      ],
                                                  },
                                              ),
                                }),
                        },
                    ),
            }),
        );
        const root = document.querySelector("#board") as HTMLElement;
        expect(root.className).toBe("board");
        expect(root.style.position).toBe("relative");
        expect(root.style.background).toBe("red");
        const section = document.querySelector("section") as HTMLElement;
        expect(section.className).toBe("free");
        expect(section.style.transform).toBe("translate(10px, 10px)");
        expect(section.style.color).toBe("blue");
        const article = document.querySelector("article") as HTMLElement;
        expect(article.className).toBe("pinned");
        expect(article.dataset.gridLayoutPart).toBe("item");
        expect(article.hasAttribute("data-static")).toBe(true);
    });

    it("a drag source and a drag preview set only structural style, and no text, during a drop", async () => {
        stubBrowser();
        const gridLayoutRef = createGridLayoutRef();
        mountInDocument(
            defineComponent({
                setup: () => () => [
                    h(GridLayout.DragSource, {
                        gridLayoutRef,
                        item: { w: 1, h: 1 },
                    }),
                    h(GridLayout.DragPreview, { gridLayoutRef }),
                    h(Everything, { gridLayoutRef }),
                ],
            }),
        );
        await nextTick();
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
        expect(document.body.textContent).toBe("");
        await press.release(...cell(6, 0));
    });

    it("ship no CSS file and set no CSS variable", () => {
        mountInDocument(Everything);
        for (const element of parts()) {
            expect(element.getAttribute("style") ?? "").not.toMatch(/--/);
        }
    });
});
