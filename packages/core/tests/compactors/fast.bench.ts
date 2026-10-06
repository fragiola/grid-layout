import { test } from "vitest";
import {
    fastHorizontalCompactor,
    fastVerticalCompactor,
    wrapCompactor,
} from "../../src/compactors";
import {
    horizontalCompactor,
    verticalCompactor,
} from "../../src/layout/compact";
import type { Compactor, Layout } from "../../src/layout/types";
import { gridLayout, messyLayout, unitLayout } from "./layouts";

// The fast compactors against the standard ones they stand in for, on the seeded layouts the
// tests use (React Grid Layout's "Performance Comparison", as benches). Informative (`pnpm
// bench`), not a gate.

const pairs: [string, Compactor, Compactor][] = [
    ["vertical", verticalCompactor, fastVerticalCompactor],
    ["horizontal", horizontalCompactor, fastHorizontalCompactor],
];

for (const count of [100, 1000]) {
    const layouts: [string, Layout][] = [
        ["messy", messyLayout(count, 12)],
        ["grid", gridLayout(count, 12)],
    ];
    for (const [shape, layout] of layouts) {
        for (const [axis, standard, fast] of pairs) {
            test(`${axis}, ${count} items, ${shape} layout`, async ({
                bench,
            }) => {
                await bench.compare(
                    bench(`standard ${axis}`, () => {
                        standard.compact(layout, 12);
                    }),
                    bench(`fast ${axis}`, () => {
                        fast.compact(layout, 12);
                    }),
                );
            });
        }
    }
}

const units = unitLayout(1000, 12);
test("wrap, 1000 items of 1 × 1", async ({ bench }) => {
    await bench("wrap", () => {
        wrapCompactor.compact(units, 12);
    }).run();
});
