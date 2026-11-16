import type { ExampleMeta } from "../meta-types";

export default {
    title: "Dashboard builder",
    description:
        "Build a dashboard: widgets from a sidebar, dragged or brought in from the keyboard, a trash to drop them in, saved as you go, and a reset.",
    category: "apps",
    order: 1,
    features: [
        "DragSource",
        "gridLayoutRef",
        "onDragStop outside",
        "persistence",
        "keyboard drop",
    ],
    docs: "/docs/guides/widget-sidebar",
} satisfies ExampleMeta;
