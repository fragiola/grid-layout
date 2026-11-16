import type { ExampleMeta } from "../meta-types";

export default {
    title: "Long dashboard",
    description:
        "A dashboard taller than its frame: hold a widget, or its corner, near the frame's edge and it scrolls, so a widget can travel the whole grid.",
    category: "drag-and-drop",
    order: 4,
    features: ["autoScroll", "scroll container", "ResizeHandle"],
    docs: "/docs/guides/mobile-and-touch",
} satisfies ExampleMeta;
