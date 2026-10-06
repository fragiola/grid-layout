import type { ExampleMeta } from "../meta-types";

export default {
    title: "Photo collage",
    description:
        "An album that flows like text: photos keep their aspect ratio and wrap at the last column, and dropping one between two others reorders the rest.",
    category: "apps",
    order: 5,
    features: [
        "wrapCompactor",
        "@fragiola/grid-layout-react/compactors",
        "aspectRatio",
        "item constraints",
    ],
    docs: "/docs/concepts/compactors",
    height: 640,
} satisfies ExampleMeta;
