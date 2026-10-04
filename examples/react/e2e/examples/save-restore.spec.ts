import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("saves a change, restores it after a reload, and forgets it on reset", async ({
    page,
}) => {
    await openExample(page, "save-restore");
    await expect(page.getByText("The default layout")).toBeVisible();
    const revenue = named(page, "Revenue");
    const visitors = await boxOf(named(page, "Visitors"));
    const start = await boxOf(revenue);
    await dragBy(page, revenue, visitors.x - start.x, 0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const moved = await boxOf(revenue);
    await page.reload();
    await expect(page.getByText("Restored the saved layout")).toBeVisible();
    expect(Math.round((await boxOf(revenue)).x)).toBe(Math.round(moved.x));
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("Back to the default layout")).toBeVisible();
    expect(Math.round((await boxOf(revenue)).x)).toBe(Math.round(start.x));
});
