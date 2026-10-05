import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, named } from "./helpers";

for (const [width, share] of [
    [1300, 1 / 4],
    [820, 1 / 2],
    [500, 1],
] as const) {
    test(`a card takes ${share} of the row at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await openExample(page, "bootstrap-style");
        // of the root's width, its padding aside: within a few hundredths
        await expect
            .poll(async () => {
                const root = await boxOf(part(page, "root"));
                const card = await boxOf(named(page, "Revenue"));
                return Math.abs(card.width / root.width - share);
            })
            .toBeLessThan(0.08);
    });
}
