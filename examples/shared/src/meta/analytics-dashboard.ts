import type { ExampleMeta } from "../meta-types";

export default {
    title: "Analytics dashboard",
    description:
        "A store's KPIs, charts and top pages: widgets moved by their header's grip, filters inside them that never drag, three breakpoints and the layout saved as you go.",
    category: "apps",
    order: 2,
    features: [
        "DragHandle",
        "controls never drag",
        "breakpoints",
        "defaultLayouts",
        "onLayoutChange(layout, layouts)",
        "persistence",
    ],
    docs: "/docs/guides/content-inside-items",
    height: 640,
} satisfies ExampleMeta;
