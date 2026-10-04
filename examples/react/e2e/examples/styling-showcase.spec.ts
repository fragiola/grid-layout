import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("lifts the held card and stripes the placeholder", async ({ page }) => {
    await openExample(page, "styling-showcase");
    const orders = named(page, "Orders");
    await orders.hover();
    await dragBy(page, named(page, "Move Orders"), -200, 120, {
        release: false,
    });
    await expect(orders).toHaveAttribute("data-dragging", "");
    await expect(orders).not.toHaveCSS("scale", "none");
    const placeholder = page.locator('[data-grid-layout-part="placeholder"]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveCSS(
        "background-image",
        /repeating-linear-gradient/,
    );
    await page.mouse.up();
    await expect(placeholder).toHaveCount(0);
    expect((await boxOf(orders)).width).toBeGreaterThan(0);
});
