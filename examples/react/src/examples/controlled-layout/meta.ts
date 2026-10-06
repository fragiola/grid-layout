import type { ExampleMeta } from "../meta-types";

export default {
    title: "Controlled layout",
    description:
        "The layout held in React state with layout and onLayoutChange. Reset and Shuffle change the state from outside and the grid follows; the JSON beside it is the state itself.",
    category: "model-api",
    order: 5,
    features: ["layout", "onLayoutChange", "controlled", "useState"],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
