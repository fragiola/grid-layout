import type { ExampleMeta } from "../meta-types";

export default {
    title: "Saving every breakpoint",
    description:
        "Each breakpoint's layout saved in the browser as it changes and restored on the next visit, with a reset to start over.",
    category: "responsive",
    order: 3,
    features: [
        "onLayoutChange(layout, layouts)",
        "defaultLayouts",
        "persistence",
    ],
    docs: "/docs/concepts/responsive",
} satisfies ExampleMeta;
