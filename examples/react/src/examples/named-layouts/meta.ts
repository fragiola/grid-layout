import type { ExampleMeta } from "../meta-types";

export default {
    title: "Named layouts",
    description:
        "Save the layout under a name, switch between saved layouts with one layout.set, and delete them. The names are kept in the browser, as app policy.",
    category: "model-api",
    order: 6,
    features: ["model.get", "layout.set", "gridLayoutRef", "localStorage"],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
