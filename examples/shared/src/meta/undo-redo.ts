import type { ExampleMeta } from "../meta-types";

export default {
    title: "Undo and redo",
    description:
        "A history built on model.subscribe: every drag, resize, drop and generated breakpoint layout is a step, and undo or redo puts the layouts back with layouts.set.",
    category: "model-api",
    order: 4,
    features: [
        "model.subscribe",
        "CommandEvent.before",
        "layouts.set",
        "layouts.generate",
        "DragSource",
        "breakpoints",
    ],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
