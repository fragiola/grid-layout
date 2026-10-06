// @vitest-environment jsdom
import { test } from "vitest";
import type { LayoutItem } from "../../src/layout/types";
import { cellPoint as at, key, pointer, setup } from "./harness";

// How long a gesture's hot path takes on a dashboard and a large board: a pointer crossing
// cells (a frame and a preview per cell) and keyboard steps, each cancelled so every run starts
// from the same layout. Informative (`pnpm bench`), not a gate; Epic #22's review compares it.

/** `count` items of 2 × 2 in rows of six, deterministic. */
function board(count: number): LayoutItem[] {
    return Array.from({ length: count }, (_, index) => ({
        id: String(index),
        x: (index % 6) * 2,
        y: Math.floor(index / 6) * 2,
        w: 2,
        h: 2,
    }));
}

for (const count of [24, 240]) {
    test(`${count} items`, async ({ bench }) => {
        const grid = setup({ layout: board(count) });
        const held = grid.item("0");
        await bench.compare(
            bench("pointer drag across 20 cells", () => {
                const press = pointer(held, ...at(0, 0));
                for (let step = 1; step <= 20; step++) {
                    press.move(...at(step % 10, Math.floor(step / 2)));
                }
                press.cancel();
            }),
            bench("pointer moves inside one cell (no preview)", () => {
                const press = pointer(held, ...at(0, 0));
                press.move(...at(1, 0));
                for (let step = 0; step < 20; step++) {
                    press.move(at(1, 0)[0] + (step % 5), at(1, 0)[1]);
                }
                press.cancel();
            }),
            bench("keyboard: grab, 10 steps, cancel", () => {
                key(held, " ");
                for (let step = 0; step < 10; step++) {
                    key(held, step % 2 ? "ArrowDown" : "ArrowRight");
                }
                key(held, "Escape");
            }),
        );
    });
}
