import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drop rules",
    description:
        "Middleware decides every drop: nothing lands in the locked columns, one clock at most, and a banner shrinks to fit. The preview shows each answer.",
    category: "external-drop",
    order: 4,
    features: ["model.use", "veto", "item.add", "dropRefused", "itemId"],
    docs: "/docs/concepts/external-drop",
} satisfies ExampleMeta;
