import type { ExampleMeta } from "../meta-types";

export default {
    title: "Hello grid",
    description:
        "Six widgets on twelve columns: drag one by its body and it pushes the others aside, pull its corner to resize it. Styled from outside.",
    category: "getting-started",
    order: 1,
    features: [
        "GridLayout.Root",
        "defaultLayout",
        "Items",
        "ResizeHandle",
        "Placeholder",
    ],
    docs: "/docs/getting-started/first-grid",
} satisfies ExampleMeta;
