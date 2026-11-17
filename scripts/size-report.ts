// From Data Grid (fragiola/data-grid, scripts/size-report.ts), same author and licence.
//
// Reports the packages' bundle sizes (Data Grid Epic #62): every `packages/*/dist/*.js` (an Angular
// package's `dist/fesm2022/*.mjs`), raw, gzip and, when the build's own minifier is reachable
// (rolldown, under tsdown), minified + gzip; and the chunks each file imports, so an entry point
// that pulls a shared chunk shows it. A report, never a gate: it prints a markdown table (to
// `$GITHUB_STEP_SUMMARY` too, in CI) and always exits 0. Run after `pnpm build`.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = join(import.meta.dirname, "..");

type Minify = (filename: string, code: string) => string;

/** rolldown's minifier, through the tsdown a package builds with; `undefined` when not found. */
async function loadMinify(): Promise<Minify | undefined> {
    try {
        const fromPackage = createRequire(
            join(root, "packages", "core", "package.json"),
        );
        const fromTsdown = createRequire(fromPackage.resolve("tsdown"));
        const { minifySync } = (await import(
            fromTsdown.resolve("rolldown/experimental")
        )) as {
            minifySync: (filename: string, code: string) => { code: string };
        };
        return (filename, code) => minifySync(filename, code).code;
    } catch {
        return undefined;
    }
}

/**
 * A package's built files: `dist/*.js` (tsdown), or `dist/fesm2022/*.mjs` (ng-packagr, the Angular
 * Package Format), relative to `dist`.
 */
function entryFiles(dist: string): string[] {
    const fesm = join(dist, "fesm2022");
    const files = existsSync(fesm)
        ? readdirSync(fesm)
              .filter((file) => file.endsWith(".mjs"))
              .map((file) => `fesm2022/${file}`)
        : readdirSync(dist).filter((file) => file.endsWith(".js"));
    return files.sort();
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** The chunks a built file imports (`./name.js`), by file name. */
function chunksOf(source: string): string[] {
    return [...source.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map(
        ([, name]) => name ?? "",
    );
}

async function main() {
    const minify = await loadMinify();
    const lines = [
        "| file | raw | gzip | min + gzip | imports |",
        "| --- | --- | --- | --- | --- |",
    ];
    for (const pkg of readdirSync(join(root, "packages"))) {
        const dist = join(root, "packages", pkg, "dist");
        if (!existsSync(dist)) {
            lines.push(`| packages/${pkg} | not built | | | |`);
            continue;
        }
        for (const name of entryFiles(dist)) {
            const source = readFileSync(join(dist, name), "utf8");
            let minified: string | undefined;
            try {
                minified = minify?.(name, source);
            } catch {
                // a report: a file the minifier cannot take shows n/a
            }
            lines.push(
                `| ${pkg}/${name} | ${kb(Buffer.byteLength(source))} | ${kb(gzipSync(source).length)} | ${minified === undefined ? "n/a" : kb(gzipSync(minified).length)} | ${chunksOf(source).join(", ")} |`,
            );
        }
    }
    const report = [
        "### Bundle sizes",
        "",
        ...lines,
        "",
        minify
            ? "min + gzip: rolldown's minifier, then gzip (a consumer's bundler gets close to it)."
            : "min + gzip: n/a (rolldown's minifier was not found).",
        "",
    ].join("\n");
    process.stdout.write(report);
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) appendFileSync(summary, report);
}

// a report, never a gate: whatever fails, the build goes on
await main().catch((error: unknown) => {
    console.error("size report failed:", error);
});
