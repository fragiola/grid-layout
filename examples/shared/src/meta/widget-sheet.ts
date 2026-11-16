import type { ExampleMeta } from "../meta-types";

export default {
    title: "Widget sheet",
    description:
        "A bottom sheet of widgets on a phone: drag one up into the grid with a finger, or bring it in from the keyboard.",
    category: "mobile",
    order: 3,
    features: ["DragSource", "touch", "gridLayoutRef", "keyboard drop"],
    docs: "/docs/guides/mobile-and-touch",
} satisfies ExampleMeta;
