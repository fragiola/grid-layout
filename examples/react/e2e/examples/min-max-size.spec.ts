import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { dragBy, named } from "./helpers";

test("a resize stops at the widget's own limits", async ({ page }) => {
    await openExample(page, "min-max-size");
    const revenue = named(page, "Revenue");
    await expect(revenue.getByText("3 × 2", { exact: true })).toBeVisible();
    // maxW is 4: three columns more stop at four
    await dragBy(page, named(page, "Resize Revenue"), 300, 0);
    await expect(revenue.getByText("4 × 2", { exact: true })).toBeVisible();
    // minW is 2: far to the start stops at two
    await dragBy(page, named(page, "Resize Revenue"), -500, 0);
    await expect(revenue.getByText("2 × 2", { exact: true })).toBeVisible();
});
