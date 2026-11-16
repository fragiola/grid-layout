import type { ExampleMeta } from "../meta-types";

export default {
    title: "Bounded",
    description:
        "A dragged item that never leaves the grid, however far the pointer goes; switch it off and the item follows the pointer past the edges.",
    category: "drag-and-drop",
    order: 2,
    features: ["bounded"],
    docs: "/docs/concepts/dragging",
} satisfies ExampleMeta;
