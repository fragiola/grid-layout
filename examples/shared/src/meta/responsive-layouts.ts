import type { ExampleMeta } from "../meta-types";

export default {
    title: "Responsive layouts",
    description:
        "Five breakpoints by the grid's own width, each with its columns and its layout: two given, the others generated. Add and remove widgets on any of them.",
    category: "responsive",
    order: 1,
    features: [
        "breakpoints",
        "cols per breakpoint",
        "defaultLayouts",
        "data-breakpoint",
        "useBreakpoint",
    ],
    docs: "/docs/concepts/responsive",
} satisfies ExampleMeta;
