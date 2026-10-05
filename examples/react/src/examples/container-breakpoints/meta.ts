import type { ExampleMeta } from "../meta-types";

export default {
    title: "Container breakpoints",
    description:
        "The same grid twice on one page, in a panel you resize and in a narrow sidebar: each takes the breakpoint of its own width, not the window's.",
    category: "responsive",
    order: 4,
    features: ["breakpoints", "container width", "useBreakpoint(ref)"],
    docs: "/docs/concepts/responsive",
} satisfies ExampleMeta;
