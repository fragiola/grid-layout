import * as core from "@fragiola/grid-layout";
import * as coreCompactors from "@fragiola/grid-layout/compactors";
import * as react from "@fragiola/grid-layout-react";
import { describe, expect, it } from "vitest";
import * as vue from "../src";
import * as compactors from "../src/compactors";

/** What only React has: its context object (Vue's is an injection key). */
const REACT_ONLY = new Set(["GridLayoutContext"]);
/** What only Vue has: its injection key. */
const VUE_ONLY = new Set(["GridLayoutKey"]);

describe("@fragiola/grid-layout-vue", () => {
    it("re-exports the core, from its sources, so an app imports one package", () => {
        const reexported: Record<string, unknown> = { ...vue };
        for (const [name, value] of Object.entries(core)) {
            expect(reexported[name], name).toBe(value);
        }
        expect(vue.VERSION).toBe("0.0.0");
    });

    it("has a counterpart of every React primitive and hook, under the same name", () => {
        const names = (module: object, only: Set<string>) =>
            Object.keys(module)
                .filter((name) => !(name in core) && !only.has(name))
                .sort();
        expect(names(vue, VUE_ONLY)).toEqual(names(react, REACT_ONLY));
        expect(Object.keys(vue.GridLayout).sort()).toEqual(
            Object.keys(react.GridLayout).sort(),
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
            expect(name in vue, name).toBe(false);
        }
    });
});
