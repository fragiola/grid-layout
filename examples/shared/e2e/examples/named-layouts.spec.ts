import { expect, test } from "@playwright/test";
import { openExample, reset } from "../helpers";
import { boxOf, columnPitch, dragBy, named, settled } from "./helpers";

test("saves two layouts and switches back and forth", async ({ page }) => {
    await openExample(page, "named-layouts");
    const name = page.getByLabel("Name");
    const list = page.getByRole("list", { name: "Saved layouts" });
    const revenue = named(page, "Revenue");
    await name.fill("First");
    await page.getByRole("button", { name: "Save" }).click();
    const first = await boxOf(revenue);
    await dragBy(page, revenue, (await columnPitch(page)) * 4, 0);
    const second = await boxOf(revenue);
    expect(second.x).toBeGreaterThan(first.x + 20);
    await name.fill("Second");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(list.getByRole("listitem")).toHaveCount(2);

    const pick = (label: string) =>
        list.getByRole("button", { name: label, exact: true });
    await pick("First").click();
    await expect(pick("First")).toHaveAttribute("aria-pressed", "true");
    await settled(page);
    expect(Math.abs((await boxOf(revenue)).x - first.x)).toBeLessThan(2);
    await pick("Second").click();
    await expect(pick("Second")).toHaveAttribute("aria-pressed", "true");
    await settled(page);
    expect(Math.abs((await boxOf(revenue)).x - second.x)).toBeLessThan(2);

    // kept in the browser: still there after a reload, and deleted for good
    await reset(page);
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: "Delete First" }).click();
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await reset(page);
    await expect(list.getByRole("listitem")).toHaveCount(1);
});
