import type { ExampleMeta } from "../meta-types";

export default {
    title: "Save and restore",
    description:
        "Every change saved in the browser and restored on the next visit; Reset forgets it. Persistence is the app's, a few lines over onLayoutChange.",
    category: "layouts",
    order: 4,
    features: ["onLayoutChange", "defaultLayout", "localStorage"],
    docs: "/docs/guides/persistence",
} satisfies ExampleMeta;
