import type { ExampleMeta } from "../meta-types";

export default {
    title: "Mobile dashboard",
    description:
        "A phone-sized dashboard in one column: swipe to scroll, hold a card to move it, the card telling the hold before it lifts.",
    category: "mobile",
    order: 1,
    features: ["long press", "data-pressing", "breakpoints", "autoScroll"],
    docs: "/docs/guides/mobile-and-touch",
} satisfies ExampleMeta;
