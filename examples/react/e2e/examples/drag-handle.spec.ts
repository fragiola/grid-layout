import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("moves only by the grip; the field and the button work as usual", async ({
    page,
}) => {
    await openExample(page, "drag-handle");
    const revenue = named(page, "Revenue");
    const start = await boxOf(revenue);
    const orders = await boxOf(named(page, "Orders"));
    await dragBy(page, revenue, orders.x - start.x, 0, {
        at: { x: start.x + start.width / 2, y: start.y + start.height - 20 },
    });
    expect(await boxOf(revenue)).toEqual(start);
    const field = named(page, "Note on Revenue");
    await field.fill("check the trend");
    await expect(field).toHaveValue("check the trend");
    await named(page, "Refresh Revenue").click();
    await expect(page.getByText("Refreshed 1 times")).toBeVisible();
    await dragBy(page, named(page, "Move Revenue"), orders.x - start.x, 0);
    await expect
        .poll(async () => Math.round((await boxOf(revenue)).x - orders.x))
        .toBe(0);
});

test("the grip is the card's tab stop", async ({ page }) => {
    await openExample(page, "drag-handle");
    await expect(named(page, "Revenue")).toHaveAttribute("tabindex", "-1");
    await expect(named(page, "Move Revenue")).toHaveAttribute("tabindex", "0");
});
