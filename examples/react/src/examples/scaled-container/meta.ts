import type { ExampleMeta } from "../meta-types";

export default {
    title: "Scaled container",
    description:
        "A dashboard on a canvas zoomed from 50% to 150% with a CSS transform: drags and resizes still land under the pointer, with no setting.",
    category: "layouts",
    order: 5,
    features: ["transform: scale()", "scale", "GridLayout.Root"],
    docs: "/docs/guides/scaled-and-zoomed-grids",
    height: 560,
} satisfies ExampleMeta;
