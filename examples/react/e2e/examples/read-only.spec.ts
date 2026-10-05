import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("shows the layout and never moves it", async ({ page }) => {
    await openExample(page, "read-only");
    const revenue = named(page, "Revenue");
    await expect(revenue).not.toHaveAttribute("data-draggable", "");
    await expect(
        page.locator('[data-grid-layout-part="resize-handle"]'),
    ).toHaveCount(0);
    const before = await boxOf(revenue);
    await dragBy(page, revenue, 400, 100);
    expect(await boxOf(revenue)).toEqual(before);
});
