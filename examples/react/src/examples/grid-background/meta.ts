import type { ExampleMeta } from "../meta-types";

export default {
    title: "Grid background",
    description:
        "The grid's cells drawn as dotted outlines behind the items, faded in only while an item is dragged, resized or held by the keyboard.",
    category: "styling",
    order: 2,
    features: [
        "GridLayout.Cells",
        "useCells",
        "data-dragging",
        "data-resizing",
    ],
    docs: "/docs/guides/grid-background",
} satisfies ExampleMeta;
