import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, named } from "./helpers";

test("pulls each edge, the opposite one staying put", async ({ page }) => {
    await openExample(page, "resize-handles");
    const revenue = named(page, "Revenue");
    await expect(revenue.getByText("4 × 3")).toBeVisible();
    await revenue.hover();
    await dragBy(page, named(page, "Resize Revenue from the end"), 90, 0);
    await expect(revenue.getByText("5 × 3")).toBeVisible();
    await revenue.hover();
    await dragBy(page, named(page, "Resize Revenue from the bottom"), 0, 60);
    await expect(revenue.getByText("5 × 4")).toBeVisible();
    await revenue.hover();
    await dragBy(page, named(page, "Resize Revenue from the start"), 90, 0);
    await expect(revenue.getByText("4 × 4")).toBeVisible();
});
