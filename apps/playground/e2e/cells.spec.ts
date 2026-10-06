import { expect, type Page, test } from "@playwright/test";
import { DIRS, drag } from "./helpers";

// The cells fixture (K6): `GridLayout.Cells` renders cols × rows cells (`auto`: the layout's
// bottom plus one), each aligned with the items, in both directions.

const fixture = (dir: string) =>
    `/fixtures/cells/${dir === "rtl" ? "?dir=rtl" : ""}`;

async function cellBox(page: Page, x: number, y: number) {
    const box = await page
        .locator(`[data-grid-layout-part="cell"][data-x="${x}"][data-y="${y}"]`)
        .boundingBox();
    if (!box) throw new Error(`no cell ${x},${y}`);
    return box;
}

for (const dir of DIRS) {
    test.describe(dir, () => {
        test("renders exactly cols × rows cells", async ({ page }) => {
            await page.goto(fixture(dir));
            // the layout reaches row 2: three rows of twelve
            await expect(
                page.locator('[data-grid-layout-part="cell"]'),
            ).toHaveCount(36);
        });

        test("aligns the cells with the items' boxes, within 1px", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            await expect(
                page.locator('[data-grid-layout-part="cell"]'),
            ).toHaveCount(36);
            for (const [id, x, y, w, h] of [
                ["a", 0, 0, 2, 2],
                ["b", 3, 0, 1, 1],
                ["c", 5, 1, 3, 1],
            ] as const) {
                const item = await page.getByTestId(`item-${id}`).boundingBox();
                if (!item) throw new Error(`no item ${id}`);
                const first = await cellBox(page, x, y);
                const last = await cellBox(page, x + w - 1, y + h - 1);
                const left = Math.min(first.x, last.x);
                const right = Math.max(
                    first.x + first.width,
                    last.x + last.width,
                );
                expect(Math.abs(item.x - left)).toBeLessThanOrEqual(1);
                expect(
                    Math.abs(item.x + item.width - right),
                ).toBeLessThanOrEqual(1);
                expect(Math.abs(item.y - first.y)).toBeLessThanOrEqual(1);
                expect(
                    Math.abs(item.y + item.height - (last.y + last.height)),
                ).toBeLessThanOrEqual(1);
            }
        });

        test("grows with the preview while an item is dragged down", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            await drag(page, page.getByTestId("item-b"), dir, 0, 4, {
                release: false,
            });
            await expect(
                page.locator('[data-grid-layout-part="cell"]'),
            ).toHaveCount(12 * 6);
            await page.mouse.up();
            await expect(
                page.locator('[data-grid-layout-part="cell"]'),
            ).toHaveCount(12 * 6);
        });
    });
}
