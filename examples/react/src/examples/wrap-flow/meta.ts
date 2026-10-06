import type { ExampleMeta } from "../meta-types";

export default {
    title: "Wrap flow",
    description:
        "Tiles that flow like the words of a paragraph, wrapping at the last column: drop one between two others and the rest move along.",
    category: "compaction",
    order: 3,
    features: [
        "wrapCompactor",
        "@fragiola/grid-layout-react/compactors",
        "cols",
    ],
    docs: "/docs/concepts/compactors",
} satisfies ExampleMeta;
