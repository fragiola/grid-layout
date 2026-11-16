import type { ExampleMeta } from "../meta-types";

export default {
    title: "Ops monitor",
    description:
        "Two dozen dense service tiles on small rows, each with its status in a word and an icon, under a pinned title bar and summary that never move.",
    category: "apps",
    order: 3,
    features: ["static", "rowHeight", "resizable={false}", "data-status"],
    docs: "/docs/concepts/collisions-and-compaction",
    height: 600,
} satisfies ExampleMeta;
