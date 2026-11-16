import type { ExampleMeta } from "../meta-types";

export default {
    title: "Custom constraints",
    description:
        "Rules written by the app: even columns only, a height from the width, a maximum area, the top half of the grid, and the built-in snapToGrid.",
    category: "constraints",
    order: 3,
    features: [
        "LayoutConstraint",
        "position",
        "size",
        "snapToGrid",
        "constraints",
    ],
    docs: "/docs/concepts/constraints",
    height: 560,
} satisfies ExampleMeta;
