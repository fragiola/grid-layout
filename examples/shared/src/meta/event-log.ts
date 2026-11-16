import type { ExampleMeta } from "../meta-types";

export default {
    title: "Event log",
    description:
        "Every committed command from model.subscribe and every gesture step from useGridLayoutEvents, streamed into a panel beside the grid, newest first, with filters.",
    category: "model-api",
    order: 3,
    features: [
        "model.subscribe",
        "CommandEvent",
        "useGridLayoutEvents",
        "GestureEvent",
        "gridLayoutRef",
    ],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
