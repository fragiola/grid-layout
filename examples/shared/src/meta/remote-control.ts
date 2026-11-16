import type { ExampleMeta } from "../meta-types";

export default {
    title: "Remote control",
    description:
        "A form outside the grid moves, resizes and removes items through model.run. Each button asks model.check first, so a command the model would refuse is disabled and says why.",
    category: "model-api",
    order: 2,
    features: [
        "gridLayoutRef",
        "model.run",
        "model.check",
        "item.move",
        "item.resize",
        "item.remove",
    ],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
