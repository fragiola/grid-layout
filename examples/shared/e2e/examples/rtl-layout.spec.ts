import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, named } from "./helpers";

test("lays the first column out on the right, and the keys follow what they show", async ({
    page,
}) => {
    await openExample(page, "rtl-layout");
    const root = await boxOf(page.locator('[data-grid-layout-part="root"]'));
    const first = named(page, "الإيرادات");
    const box = await boxOf(first);
    expect(box.x + box.width).toBeGreaterThan(root.x + root.width - 30);
    await first.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await expect(first.getByText("2، 1")).toBeVisible();
});
