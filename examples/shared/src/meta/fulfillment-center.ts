import type { ExampleMeta } from "../meta-types";

export default {
    title: "Fulfillment center",
    description:
        "A warehouse's live operations: KPIs, charts drawn to their tile's size, dock doors, carriers and alerts that keep ticking while widgets move and resize, and a critical alert that grows its tile until acknowledged.",
    category: "apps",
    order: 7,
    features: [
        "live data",
        "DragHandle",
        "ResizeHandle",
        "breakpoints",
        "static",
        "gridLayoutRef",
        'model.run("item.resize")',
    ],
    docs: "/docs/concepts/model-and-engine",
    layout: "fill",
    height: 640,
} satisfies ExampleMeta;
