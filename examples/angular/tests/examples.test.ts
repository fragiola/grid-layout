import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
    collectFiles,
    type ExampleEntry,
    examplesApp,
    importsOf,
    listExampleSlugs,
    loadExamples,
} from "examples-shared/scripts/examples-lib";
import { beforeAll, describe, expect, it } from "vitest";

// The Angular side of the example contract: an example is standalone components in TypeScript
// (`index.ts` its entry, default-exporting the example's component; templates inline) and
// `styles.ts`, importing only what a consumer can copy: Angular, the Angular package, the kit
// (`#/components/…`, `#/lib/cn`) and relative files inside examples/. Every example assembles the
// grid layout itself, keeps the id it has in examples/react, and binds its classes from
// `styles.ts`. What every framework shares (the metadata) is checked in examples/shared/tests.

const APP = examplesApp("angular");
const EXAMPLES_DIR = APP.examplesDir;

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^@angular\/(core|common)$/,
    // the Angular package re-exports the core: an example never imports @fragiola/grid-layout
    /^@fragiola\/grid-layout-angular(\/compactors)?$/,
    /^@lucide\/angular$/,
    /^#\/components\/(ui|atoms)\/[a-z-]+$/,
    /^#\/lib\/cn$/,
];

/** Site files under examples/ that are not example code. */
const SITE_FILES = [/\.generated\.ts$/, /\.md$/, /\.css$/];

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

let examples: ExampleEntry[] = [];
beforeAll(async () => {
    examples = await loadExamples(APP);
});

describe("the Angular examples", () => {
    const slugs = listExampleSlugs(APP);

    it("are all in the manifest, each with a valid meta", () => {
        expect(examples.map((e) => e.slug).sort()).toEqual(slugs);
    });

    it("keep the ids of examples/react", () => {
        const react = listExampleSlugs(examplesApp("react"));
        expect(slugs.length).toBeGreaterThan(0);
        for (const slug of slugs) expect(react, slug).toContain(slug);
    });

    it("import only what a consumer can copy", () => {
        const files = walk(EXAMPLES_DIR)
            .map((file) => relative(EXAMPLES_DIR, file))
            .filter(
                (file) => !SITE_FILES.some((pattern) => pattern.test(file)),
            );
        for (const file of files) {
            const source = readFileSync(join(EXAMPLES_DIR, file), "utf-8");
            for (const specifier of importsOf(source)) {
                if (specifier.startsWith(".")) continue;
                expect(
                    ALLOWED.some((pattern) => pattern.test(specifier)),
                    `${file} imports "${specifier}"`,
                ).toBe(true);
            }
        }
    });

    it.each(slugs)("%s shows its entry first in the code panel", (slug) => {
        const { files } = collectFiles(APP, slug);
        expect(files[0]).toBe(`${slug}/index.ts`);
        expect(examples.find((e) => e.slug === slug)?.files).toEqual(files);
    });

    it.each(slugs)("%s default-exports its component", (slug) => {
        const source = readFileSync(
            join(EXAMPLES_DIR, slug, "index.ts"),
            "utf-8",
        );
        expect(source).toMatch(/^export default class \w+/m);
    });

    it.each(slugs)("%s assembles the grid layout itself", (slug) => {
        const source = readFileSync(
            join(EXAMPLES_DIR, slug, "index.ts"),
            "utf-8",
        );
        expect(source).toMatch(/\sgridLayoutRoot\b/);
    });

    it.each(slugs)("%s keeps class strings out of its templates", (slug) => {
        expect(
            statSync(join(EXAMPLES_DIR, slug, "styles.ts"), {
                throwIfNoEntry: false,
            })?.isFile(),
        ).toBe(true);
        for (const file of walk(join(EXAMPLES_DIR, slug))) {
            if (file.endsWith("styles.ts")) continue;
            const source = readFileSync(file, "utf-8");
            // looks go in styles.ts and are bound (`[class]="styles.part"`)
            expect(/\sclass="/.test(source), relative(EXAMPLES_DIR, file)).toBe(
                false,
            );
            expect(/\bcn\(/.test(source), relative(EXAMPLES_DIR, file)).toBe(
                false,
            );
        }
    });

    it("use the app's API only: never engine.adapter (an adapter's side)", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!file.endsWith(".ts")) continue;
            expect(
                readFileSync(file, "utf-8"),
                relative(EXAMPLES_DIR, file),
            ).not.toMatch(/\.adapter\b/);
        }
    });
});

describe("the Angular kit", () => {
    it("renders no GridLayout primitive: the examples assemble the grid layout", () => {
        for (const file of walk(join(EXAMPLES_DIR, "_kit"))) {
            expect(
                importsOf(readFileSync(file, "utf-8")),
                relative(EXAMPLES_DIR, file),
            ).not.toContain("@fragiola/grid-layout-angular");
        }
    });
});
