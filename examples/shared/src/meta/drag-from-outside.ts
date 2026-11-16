import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drag from outside",
    description:
        "One drag source beside the grid: drag it in, or Tab to it and press Enter, and the grid adds a note where it lands.",
    category: "external-drop",
    order: 1,
    features: [
        "DragSource",
        "DragPreview",
        "gridLayoutRef",
        "onDrop",
        "createId",
    ],
    docs: "/docs/concepts/external-drop",
} satisfies ExampleMeta;
