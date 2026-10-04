import type { ExampleMeta } from "../meta-types";

export default {
    title: "Compaction modes",
    description:
        "A scattered layout settled three ways, vertical, horizontal or not at all, with collisions pushed or prevented and the item count up to you.",
    category: "compaction",
    order: 1,
    features: [
        "verticalCompactor",
        "horizontalCompactor",
        "noCompactor",
        "preventCollision",
    ],
    docs: "/docs/concepts/collisions-and-compaction",
} satisfies ExampleMeta;
