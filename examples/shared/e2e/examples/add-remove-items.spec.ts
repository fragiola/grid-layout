import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, expectNoOverlap, named } from "./helpers";

test("adds a widget where there is room and removes one from its button", async ({
    page,
}) => {
    await openExample(page, "add-remove-items");
    const items = page.locator('[data-grid-layout-part="item"]');
    await expect(items).toHaveCount(4);
    await page.getByRole("button", { name: "Add Refunds" }).click();
    await expect(items).toHaveCount(5);
    await expect(named(page, "Refunds")).toBeVisible();
    await expectNoOverlap(page);
    // pressing the remove button and moving is not a drag: the button still works
    await dragBy(page, named(page, "Remove Orders"), 0, 0);
    await expect(items).toHaveCount(4);
    await expect(page.getByText("4 widgets")).toBeVisible();
});
