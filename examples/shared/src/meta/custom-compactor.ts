import type { ExampleMeta } from "../meta-types";

export default {
    title: "Custom compactor",
    description:
        "A compactor written in the example: every widget slides toward the start of its own row until it meets another, and rows never close up.",
    category: "compaction",
    order: 5,
    features: ["createCompactor", "Compactor", "firstCollision"],
    docs: "/docs/concepts/compactors",
} satisfies ExampleMeta;
