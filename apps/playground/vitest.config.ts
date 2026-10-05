import { defineConfig } from "vitest/config";
import { examplesTestResolve } from "../../examples/react/vite.shared.ts";

export default defineConfig({
    ...examplesTestResolve(),
    test: {
        name: "playground",
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
