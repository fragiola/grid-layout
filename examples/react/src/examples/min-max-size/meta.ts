import type { ExampleMeta } from "../meta-types";

export default {
    title: "Minimum and maximum size",
    description:
        "Items with their own limits: a resize stops at minW, maxW, minH and maxH, and the placeholder shows where it stopped.",
    category: "resizing",
    order: 2,
    features: ["minW", "maxW", "minH", "maxH"],
    docs: "/docs/concepts/resizing",
} satisfies ExampleMeta;
