import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Fragiola UI theme (the palettes, the base stylesheet) and `cn` are vendored into
// examples/react by its scripts/vendor-fragiola.ts; this app copies them, so the Angular examples
// wear the React examples' classes. A copy is the original with its first line (the vendoring
// header) replaced. The kit's framework-neutral files (its data) are copied as they are.

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

/** Every file of this app's _kit: until Epic #44 brings a kit of its own, all are React's data. */
const SAME = listFiles(join(here, "src/examples/_kit")).map((file) =>
    relative(here, file),
);

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
});
