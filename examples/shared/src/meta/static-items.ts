import type { ExampleMeta } from "../meta-types";

export default {
    title: "Static items",
    description:
        "A banner and a pinned widget that never move: dragged items flow around them, and compaction settles the others below.",
    category: "layouts",
    order: 2,
    features: ["static", "data-static", "compaction around statics"],
    docs: "/docs/concepts/collisions-and-compaction",
} satisfies ExampleMeta;
