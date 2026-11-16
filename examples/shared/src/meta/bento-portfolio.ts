import type { ExampleMeta } from "../meta-types";

export default {
    title: "Bento portfolio",
    description:
        "A designer's portfolio as a bento grid: a pinned hero, project pictures of mixed sizes that keep their aspect ratio as they are resized, and text tiles.",
    category: "apps",
    order: 4,
    features: [
        "aspectRatio",
        "item constraints",
        "constraintRegistry",
        "static",
        "generated SVG",
    ],
    docs: "/docs/concepts/constraints",
    height: 640,
} satisfies ExampleMeta;
