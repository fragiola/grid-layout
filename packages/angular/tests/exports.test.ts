import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@fragiola/grid-layout";
import * as coreCompactors from "@fragiola/grid-layout/compactors";
import { describe, expect, it } from "vitest";
import * as compactors from "../src/compactors/index";
import * as angular from "../src/public-api";

const read = (path: string) =>
    readFileSync(join(import.meta.dirname, "..", path), "utf-8");

/**
 * The runtime names a module of the React package exports, read from its source (its `.tsx`
 * files are not this package's to compile): `export * as X`, `export { … }` lists without their
 * `type` specifiers, and exported `const`, `function` and `class` declarations.
 */
function runtimeNames(source: string): string[] {
    const names = [
        ...[...source.matchAll(/^export\s+\*\s+as\s+(\w+)/gm)].map(
            ([, name]) => name,
        ),
        ...[
            ...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm),
        ].map(([, name]) => name),
        ...[...source.matchAll(/^export\s+\{([^}]*)\}/gm)].flatMap(
            ([, list = ""]) =>
                list
                    .split(",")
                    .map((raw) => raw.trim())
                    .filter((raw) => raw !== "" && !raw.startsWith("type "))
                    .map((raw) => raw.split(/\s+as\s+/).at(-1)),
        ),
    ];
    return [...new Set(names.filter((name) => name !== undefined))];
}

const react = runtimeNames(read("../react/src/index.ts"));
/** React's primitives (`GridLayout.X`), from its namespace module. */
const reactParts = runtimeNames(read("../react/src/parts.ts"));
/** React's hooks (`useX`). */
const reactHooks = react.filter((name) => /^use[A-Z]/.test(name));

/** `useItem` → `injectItem`; a ref is made by the core's `createGridLayoutRef`, in any class. */
const injectionOf = (hook: string) =>
    hook === "useGridLayoutRef"
        ? "createGridLayoutRef"
        : `inject${hook.slice("use".length)}`;

/** What only React has, and its Angular counterpart's name. */
const REACT_ONLY: Record<string, string | null> = {
    // the namespace: every directive, for a component's `imports`
    GridLayout: "GRID_LAYOUT",
    // its context object (the Angular root's context is its directive, injected by its parts)
    GridLayoutContext: null,
};

/** The files the package sources import. */
function sources(): string[] {
    const files: string[] = [];
    const walk = (folder: string) => {
        for (const entry of readdirSync(folder, { withFileTypes: true })) {
            const full = join(folder, entry.name);
            if (entry.isDirectory()) walk(full);
            else files.push(full);
        }
    };
    walk(join(import.meta.dirname, "..", "src"));
    return files;
}

describe("@fragiola/grid-layout-angular", () => {
    it("re-exports the whole core, identical, so an app imports one package", () => {
        expect(read("src/public-api.ts")).toMatch(
            /^export \* from "@fragiola\/grid-layout";$/m,
        );
        const exported: Record<string, unknown> = { ...angular };
        for (const [name, value] of Object.entries(core)) {
            expect(exported[name], name).toBe(value);
        }
        expect(angular.VERSION).toBe("0.0.0");
    });

    it("has a directive for every React primitive (GridLayout.X → GridLayoutX), each in GRID_LAYOUT", () => {
        expect(reactParts.length).toBe(9);
        for (const part of reactParts) {
            const directive = (angular as Record<string, unknown>)[
                `GridLayout${part}`
            ];
            expect(directive, `GridLayout.${part}`).toBeTypeOf("function");
            expect(angular.GRID_LAYOUT, `GridLayout${part}`).toContain(
                directive,
            );
        }
        expect(angular.GRID_LAYOUT).toHaveLength(reactParts.length);
    });

    it("has an injection function for every React hook (useX → injectX)", () => {
        expect(reactHooks.length).toBe(14);
        for (const hook of reactHooks) {
            expect(
                (angular as Record<string, unknown>)[injectionOf(hook)],
                hook,
            ).toBeTypeOf("function");
        }
    });

    it("exports nothing at runtime but the core and the counterparts of React's names", () => {
        const expected = new Set<string>();
        expect(react).toContain("GridLayout");
        for (const name of react) {
            if (name in REACT_ONLY) {
                const counterpart = REACT_ONLY[name];
                if (counterpart) expected.add(counterpart);
            } else if (/^use[A-Z]/.test(name)) {
                expected.add(injectionOf(name));
            } else {
                // a part exported on its own (`Root`): its directive
                expect(reactParts, name).toContain(name);
                expected.add(`GridLayout${name}`);
            }
        }
        expect(
            Object.keys(angular)
                .filter((name) => !(name in core))
                .sort(),
        ).toEqual([...expected].filter((name) => !(name in core)).sort());
    });

    it("re-exports the core's compactors entry at /compactors, apart from the main entry", () => {
        expect(Object.keys(compactors).sort()).toEqual(
            Object.keys(coreCompactors).sort(),
        );
        for (const [name, value] of Object.entries(coreCompactors)) {
            expect((compactors as Record<string, unknown>)[name], name).toBe(
                value,
            );
            expect(name in angular, name).toBe(false);
        }
    });

    it("imports nothing at runtime but @angular/core and the core, and depends on the core only", () => {
        const pkg = JSON.parse(read("package.json")) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        expect(Object.keys(pkg.dependencies ?? {})).toEqual([
            "@fragiola/grid-layout",
        ]);
        expect(Object.keys(pkg.peerDependencies ?? {})).toEqual([
            "@angular/core",
        ]);
        const IMPORT = /(?:from\s+|import\s*\(\s*)["']([^"'.][^"']*)["']/g;
        for (const file of sources()) {
            for (const [, specifier] of readFileSync(file, "utf8").matchAll(
                IMPORT,
            )) {
                expect(
                    [
                        "@angular/core",
                        "@fragiola/grid-layout",
                        "@fragiola/grid-layout/compactors",
                    ],
                    file,
                ).toContain(specifier);
            }
        }
    });
});
