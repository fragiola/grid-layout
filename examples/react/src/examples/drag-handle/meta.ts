import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drag handle",
    description:
        "Cards that move only by their grip, which is also their tab stop; the field and the button in the body work as usual and never start a drag.",
    category: "drag-and-drop",
    order: 1,
    features: ["DragHandle", "controls never drag", "tab stop"],
    docs: "/docs/concepts/dragging",
} satisfies ExampleMeta;
