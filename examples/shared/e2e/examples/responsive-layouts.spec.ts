import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { named } from "./helpers";

test("takes the breakpoint of the grid's width, and adds and removes on any", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1300, height: 800 });
    await openExample(page, "responsive-layouts");
    const current = page.getByTestId("breakpoint");
    await expect(current).toContainText("lg · 12 columns");
    await page.setViewportSize({ width: 820, height: 800 });
    await expect(current).toContainText("sm · 6 columns");
    await expect(part(page, "root")).toHaveAttribute("data-breakpoint", "sm");
    await page.setViewportSize({ width: 560, height: 800 });
    await expect(current).toContainText("xs · 4 columns");
    const items = part(page, "item");
    await expect(items).toHaveCount(6);
    await page.getByRole("button", { name: "Add Refunds" }).click();
    await expect(items).toHaveCount(7);
    // added here, there at the next breakpoint too
    await page.setViewportSize({ width: 1300, height: 800 });
    await expect(current).toContainText("lg · 12 columns");
    await expect(named(page, "Refunds")).toBeVisible();
    await named(page, "Remove Refunds").click();
    await expect(items).toHaveCount(6);
});
