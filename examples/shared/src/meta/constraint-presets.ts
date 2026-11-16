import type { ExampleMeta } from "../meta-types";

export default {
    title: "Constraint presets",
    description:
        "The built-in constraints side by side: the defaults, bounded X or Y, the container's height, no size limits or no rules at all, with compaction on or off.",
    category: "constraints",
    order: 1,
    features: [
        "constraints",
        "defaultConstraints",
        "gridBounds",
        "minMaxSize",
        "boundedX",
        "boundedY",
        "containerBounds",
        "maxRows",
        "noCompactor",
    ],
    docs: "/docs/concepts/constraints",
    height: 600,
} satisfies ExampleMeta;
