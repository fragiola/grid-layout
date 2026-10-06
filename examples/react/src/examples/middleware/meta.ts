import type { ExampleMeta } from "../meta-types";

export default {
    title: "Middleware",
    description:
        "Two app rules as middleware: a reserved area no widget may enter, and three widgets per row at most. A drag previews each answer, and a log says why a move was refused.",
    category: "model-api",
    order: 1,
    features: ["model.use", "veto", "next()", "dry run", "useGridLayoutEvents"],
    docs: "/docs/guides/model-api-recipes",
} satisfies ExampleMeta;
