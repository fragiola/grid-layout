import type { ExampleMeta } from "../meta-types";

export default {
    title: "Keyboard",
    description:
        "Grab a widget with Space, move it with the arrows, resize it with Shift, drop or put it back; every step is said in a live region.",
    category: "keyboard",
    order: 1,
    features: [
        "Space and Enter",
        "arrows",
        "Shift + arrows",
        "useGridLayoutEvents",
        "data-grabbed",
    ],
    docs: "/docs/concepts/keyboard-and-accessibility",
} satisfies ExampleMeta;
