import type { ExampleMeta } from "../meta-types";

export default {
    title: "Add and remove",
    description:
        "The layout held in the app's state: add a widget below everything and it rises where there is room; remove one from a button inside it.",
    category: "layouts",
    order: 3,
    features: [
        "layout",
        "onLayoutChange",
        "y: Infinity",
        "controls never drag",
    ],
    docs: "/docs/concepts/layout-items",
} satisfies ExampleMeta;
