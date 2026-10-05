import type { ExampleMeta } from "../meta-types";

export default {
    title: "Widget sidebar",
    description:
        "A sidebar of widgets outside the grid, each with its own size: drag one in, or bring it in from the keyboard, and hear where it lands.",
    category: "external-drop",
    order: 2,
    features: [
        "DragSource",
        "gridLayoutRef",
        "keyboard drop",
        "useGridLayoutEvents",
        "data",
    ],
    docs: "/docs/guides/widget-sidebar",
} satisfies ExampleMeta;
