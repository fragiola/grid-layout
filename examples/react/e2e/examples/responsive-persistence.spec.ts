import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("saves every breakpoint as it changes, restores it, and forgets it on reset", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1300, height: 800 });
    await openExample(page, "responsive-persistence");
    await expect(page.getByText("The default layouts")).toBeVisible();
    const revenue = named(page, "Revenue");
    const visitors = await boxOf(named(page, "Visitors"));
    const start = await boxOf(revenue);
    await dragBy(page, revenue, visitors.x - start.x, 0);
    await expect(page.getByText(/Saved \d+ layouts/)).toBeVisible();
    const moved = await boxOf(revenue);
    await page.reload();
    await expect(page.getByText("Restored the saved layouts")).toBeVisible();
    expect(Math.round((await boxOf(revenue)).x)).toBe(Math.round(moved.x));
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("Back to the default layouts")).toBeVisible();
    await expect
        .poll(async () => Math.round((await boxOf(revenue)).x))
        .toBe(Math.round(start.x));
});
