import type { ExampleMeta } from "../meta-types";

export default {
    title: "Fast compactors",
    description:
        "A thousand tiles settled by the standard compactors or the fast ones, with the time of the last compaction measured as you switch and drag.",
    category: "compaction",
    order: 4,
    features: [
        "fastVerticalCompactor",
        "fastHorizontalCompactor",
        "@fragiola/grid-layout-react/compactors",
        "Compactor",
    ],
    docs: "/docs/concepts/compactors",
    height: 560,
} satisfies ExampleMeta;
