import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drop files",
    description:
        "Drop files from your computer onto the grid: each becomes a card with its name and size, where it lands. Anything else is refused.",
    category: "external-drop",
    order: 5,
    features: ["onExternalDrag", "onDrop", "data", "item.add"],
    docs: "/docs/concepts/external-drop",
} satisfies ExampleMeta;
