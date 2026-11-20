import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Fragiola UI theme (the palettes, the base stylesheet) and `cn` are vendored into
// examples/react by its scripts/vendor-fragiola.ts; this app copies them, so the Vue examples wear
// the React examples' classes. A copy is the original with its first line (the vendoring header)
// replaced. The kit's framework-neutral files (its data, undo, storage, toolbox, …) are copied as
// they are; `announce.ts` shares React's sentences, and only its live-region state is Vue's.

const here = join(import.meta.dirname, "..");
const react = join(here, "..", "react");

function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

const COPIES = [
    ...listFiles(join(here, "src/styles")),
    join(here, "src/lib/cn.ts"),
].map((file) => relative(here, file));

const SAME = [
    "catalogue",
    "charts",
    "datasets",
    "files",
    "fulfillment",
    "hit",
    "images",
    "layouts",
    "log",
    "storage",
    "toolbox",
    "undo",
    "widgets",
]
    .map((name) => `src/examples/_kit/${name}.ts`)
    // an example whose looks are written through `data-*` only, so its classes are React's as they are
    .concat("src/examples/fulfillment-center/styles.ts");

const body = (source: string) => source.slice(source.indexOf("\n") + 1);

describe("the files copied from examples/react", () => {
    it.each(COPIES)("%s", (file) => {
        const copy = readFileSync(join(here, file), "utf8");
        const original = readFileSync(join(react, file), "utf8");
        expect(copy.split("\n")[0]).toContain(
            `Copied from examples/react/${file}`,
        );
        expect(body(copy)).toBe(body(original));
    });

    it.each(SAME)("%s, as it is", (file) => {
        expect(readFileSync(join(here, file), "utf8")).toBe(
            readFileSync(join(react, file), "utf8"),
        );
    });

    it("cover every palette examples/react vendors", () => {
        const names = (dir: string) => readdirSync(dir).sort();
        expect(names(join(here, "src/styles/palettes"))).toEqual(
            names(join(react, "src/styles/palettes")),
        );
    });

    it("_kit/announce.ts says what React's says", () => {
        const sentences = (source: string) =>
            source.slice(
                source.indexOf("/** The parts of a gesture event"),
                source.indexOf("/** A message for a live region"),
            );
        const file = "src/examples/_kit/announce.ts";
        expect(sentences(readFileSync(join(here, file), "utf8"))).toBe(
            sentences(readFileSync(join(react, file), "utf8")),
        );
    });
});
