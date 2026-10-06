import type { ExampleMeta } from "../meta-types";

export default {
    title: "Free-form kanban",
    description:
        "Sticky notes on a board of three lanes: drag a new one in, write on it, move it anywhere free; a move onto another note is refused, nothing settles.",
    category: "apps",
    order: 6,
    features: [
        "noCompactor",
        "preventCollision",
        "maxRows",
        "GridLayout.Cells",
        "DragSource",
        "controls never drag",
    ],
    docs: "/docs/concepts/collisions-and-compaction",
    height: 640,
} satisfies ExampleMeta;
