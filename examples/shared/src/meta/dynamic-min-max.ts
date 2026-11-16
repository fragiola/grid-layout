import type { ExampleMeta } from "../meta-types";

export default {
    title: "Dynamic size limits",
    description:
        "Limits that move with the size, a minimum width once tall and a maximum height once wide, written as middleware on the resize commands and switched on or off.",
    category: "constraints",
    order: 4,
    features: ["model.use", "item.resize", "item.place", "middleware"],
    docs: "/docs/concepts/constraints",
} satisfies ExampleMeta;
