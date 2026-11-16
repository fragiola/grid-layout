import type { ExampleMeta } from "../meta-types";

export default {
    title: "Read-only",
    description:
        "A dashboard that only shows: dragging and resizing are off for the whole grid, so the resize handles render nothing.",
    category: "getting-started",
    order: 3,
    features: ["draggable={false}", "resizable={false}", "data-draggable"],
    docs: "/docs/concepts/layout-items",
} satisfies ExampleMeta;
