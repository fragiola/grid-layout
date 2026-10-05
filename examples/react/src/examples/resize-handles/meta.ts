import type { ExampleMeta } from "../meta-types";

export default {
    title: "Resize handles",
    description:
        "All eight sides and corners, logical: pull any edge and the opposite one stays put, in left-to-right and right-to-left alike.",
    category: "resizing",
    order: 1,
    features: ["ResizeHandle", "side", "data-side", "data-resizing"],
    docs: "/docs/concepts/resizing",
} satisfies ExampleMeta;
