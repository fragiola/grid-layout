import { expect, type Page, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

// 8 columns on a 640px canvas, a 10px gap and padding: one column step is 78.75px before the zoom.
const STEP = (640 - 2 * 10 + 10) / 8;

async function zoomTo(page: Page, label: string, zoom: number) {
    await page.getByRole("button", { name: label, exact: true }).click();
    // the canvas draws the root at the zoom
    await expect
        .poll(async () => (await boxOf(part(page, "root"))).width)
        .toBeCloseTo(640 * zoom, 0);
}

for (const [label, zoom] of [
    ["50%", 0.5],
    ["150%", 1.5],
] as const) {
    test(`at ${label}, a drag and a resize land as many columns over as the pointer crossed`, async ({
        page,
    }) => {
        await openExample(page, "scaled-container");
        await zoomTo(page, label, zoom);
        const orders = named(page, "Orders");
        await expect(orders).toContainText("column 3, row 0");
        // two columns of on-screen distance
        await dragBy(page, orders, 2 * STEP * zoom, 0);
        await expect(orders).toContainText("column 5, row 0");

        const revenue = named(page, "Revenue");
        await expect(revenue).toContainText("3 × 2");
        await revenue.hover();
        const handle = named(page, "Resize Revenue");
        const box = await boxOf(handle);
        await dragBy(page, handle, STEP * zoom, 0, {
            at: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        });
        await expect(revenue).toContainText("4 × 2");
    });
}
