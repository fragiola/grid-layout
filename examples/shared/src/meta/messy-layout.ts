import type { ExampleMeta } from "../meta-types";

export default {
    title: "Messy layout",
    description:
        "Overlapping, out-of-bounds items and one with no row, corrected on load: in bounds, apart and settled, and the app told once.",
    category: "layouts",
    order: 1,
    features: ["normalisation", "y: Infinity", "layout.set", "onLayoutChange"],
    docs: "/docs/concepts/layout-items",
} satisfies ExampleMeta;
