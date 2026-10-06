import { expect, test } from "@playwright/test";
import { boxOf, center, DIRS, STEP_X, STEP_Y } from "./helpers";

// The scaled fixture (K5): a grid inside a parent at `transform: scale()`, with no `scale` prop.
// Moves and resizes land under the pointer, in both directions, at a scale below and above 1.

// room for the grid drawn at 1.5: 1440px wide
test.use({ viewport: { width: 1700, height: 900 } });

for (const scale of [0.5, 1.5]) {
    for (const dir of DIRS) {
        test.describe(`scale ${scale}, ${dir}`, () => {
            const page = (query = "") =>
                `/fixtures/scaled/?scale=${scale}${dir === "rtl" ? "&dir=rtl" : ""}${query}`;
            const sign = dir === "rtl" ? -1 : 1;

            test("drags an item under the pointer and lands it where the pointer is", async ({
                page: browser,
            }) => {
                await browser.goto(page());
                const item = browser.getByTestId("item-c");
                const from = await center(item);
                await browser.mouse.move(from.x, from.y);
                await browser.mouse.down();
                const to = {
                    x: from.x + sign * 3 * STEP_X * scale,
                    y: from.y + STEP_Y * scale,
                };
                await browser.mouse.move(to.x, to.y, { steps: 8 });
                // the held item stays under the pointer, on screen
                const held = await center(item);
                expect(Math.abs(held.x - to.x)).toBeLessThan(2);
                expect(Math.abs(held.y - to.y)).toBeLessThan(2);
                await browser.mouse.up();
                expect(await boxOf(browser, "c")).toMatchObject({ x: 7, y: 0 });
            });

            test("resizes an item by as many cells as the pointer crosses", async ({
                page: browser,
            }) => {
                await browser.goto(page());
                const from = await center(browser.getByTestId("resize-a"));
                await browser.mouse.move(from.x, from.y);
                await browser.mouse.down();
                await browser.mouse.move(
                    from.x + sign * 2 * STEP_X * scale,
                    from.y + STEP_Y * scale,
                    { steps: 8 },
                );
                await browser.mouse.up();
                expect(await boxOf(browser, "a")).toMatchObject({
                    x: 0,
                    w: 4,
                    h: 3,
                });
            });
        });
    }
}
