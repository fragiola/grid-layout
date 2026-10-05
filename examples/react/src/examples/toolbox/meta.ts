import type { ExampleMeta } from "../meta-types";

export default {
    title: "Toolbox",
    description:
        "Drag a widget out of the grid into the toolbox to put it away, and drag it back in, or do both from the keyboard.",
    category: "external-drop",
    order: 3,
    features: ["onDragStop outside", "DragSource", "itemId", "item.remove"],
    docs: "/docs/concepts/external-drop",
} satisfies ExampleMeta;
