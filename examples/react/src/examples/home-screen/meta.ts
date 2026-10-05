import type { ExampleMeta } from "../meta-types";

export default {
    title: "Home screen",
    description:
        "App icons on a phone's home screen, one cell each: hold one to rearrange them, and the others tilt while it moves. All the motion is CSS.",
    category: "mobile",
    order: 2,
    features: [
        "data-pressing",
        "data-dragging",
        "1×1 tiles",
        "resizable={false}",
    ],
    docs: "/docs/guides/mobile-and-touch",
} satisfies ExampleMeta;
