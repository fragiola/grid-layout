import * as core from "@fragiola/grid-layout";
import { describe, expect, it } from "vitest";
import * as react from "../src";

describe("@fragiola/grid-layout-react", () => {
    it("re-exports the core, from its sources, so an app imports one package", () => {
        const reexported: Record<string, unknown> = { ...react };
        for (const [name, value] of Object.entries(core)) {
            expect(reexported[name], name).toBe(value);
        }
        expect(react.VERSION).toBe("0.0.0");
    });

    it("gathers the parts under one namespace", () => {
        expect(Object.keys(react.GridLayout).sort()).toEqual(
            [
                "DragHandle",
                "Item",
                "Items",
                "Placeholder",
                "ResizeHandle",
                "Root",
            ].sort(),
        );
    });
});
