import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("a dragged widget never leaves the grid, until bounds are switched off", async ({
    page,
}) => {
    await openExample(page, "bounded");
    const root = await boxOf(page.locator('[data-grid-layout-part="root"]'));
    const orders = named(page, "Orders");
    await dragBy(page, orders, -600, -80, { release: false });
    expect((await boxOf(orders)).x).toBeGreaterThanOrEqual(root.x - 1);
    await page.mouse.up();
    await page.getByRole("switch").click();
    await dragBy(page, named(page, "Visitors"), -900, 0, { release: false });
    expect((await boxOf(named(page, "Visitors"))).x).toBeLessThan(root.x);
    await page.mouse.up();
});
