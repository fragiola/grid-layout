import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { expectNoOverlap } from "./helpers";

test("corrects the mess on load, tells it once, and again when it comes back", async ({
    page,
}) => {
    await openExample(page, "messy-layout");
    await expect(page.getByText("Layout changes told: 1")).toBeVisible();
    await expectNoOverlap(page);
    await page.getByRole("button", { name: "Mess it up again" }).click();
    await expect(page.getByText("Layout changes told: 2")).toBeVisible();
    await expectNoOverlap(page);
});
