import * as core from "@fragiola/grid-layout";
import * as coreCompactors from "@fragiola/grid-layout/compactors";
import { describe, expect, it } from "vitest";
import * as react from "../src";
import * as compactors from "../src/compactors";

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
                "Cells",
                "DragHandle",
                "DragPreview",
                "DragSource",
                "Item",
                "Items",
                "Placeholder",
                "ResizeHandle",
                "Root",
            ].sort(),
        );
    });

    it("re-exports the core's compactors entry at /compactors, apart from the main entry", () => {
        expect(Object.keys(compactors).sort()).toEqual(
            Object.keys(coreCompactors).sort(),
        );
        for (const [name, value] of Object.entries(coreCompactors)) {
            expect((compactors as Record<string, unknown>)[name], name).toBe(
                value,
            );
            expect(name in react, name).toBe(false);
        }
        expect(Object.keys(compactors)).toContain("wrapCompactor");
    });
});
