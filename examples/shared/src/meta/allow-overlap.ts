import type { ExampleMeta } from "../meta-types";

export default {
    title: "Overlap",
    description:
        "Notes that stack wherever they are dropped: with allowOverlap nothing is pushed and nothing settles, and the layout keeps every overlap.",
    category: "compaction",
    order: 2,
    features: ["allowOverlap", "noCompactor"],
    docs: "/docs/concepts/collisions-and-compaction",
} satisfies ExampleMeta;
