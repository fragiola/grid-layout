import type { ExampleMeta } from "../meta-types";

export default {
    title: "Aspect ratio",
    description:
        "A video, a photo, a square and a banner that keep their ratio in pixels as they are resized, each through its own aspectRatio constraint stored in the layout.",
    category: "constraints",
    order: 2,
    features: ["aspectRatio", "constraintRegistry", "item constraints", "env"],
    docs: "/docs/concepts/constraints",
} satisfies ExampleMeta;
