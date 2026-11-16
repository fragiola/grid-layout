import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { expectNoOverlap } from "./helpers";

test("settles the same layout three ways, with more or fewer items", async ({
    page,
}) => {
    await openExample(page, "compaction-modes");
    const items = page.locator('[data-grid-layout-part="item"]');
    await expect(items).toHaveCount(8);
    for (const mode of ["Horizontal", "None", "Vertical"]) {
        await page.getByRole("button", { name: mode }).click();
        await expect(page.getByRole("button", { name: mode })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await expectNoOverlap(page);
    }
    await page.getByRole("button", { name: "More items" }).click();
    await expect(items).toHaveCount(10);
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        "true",
    );
});
