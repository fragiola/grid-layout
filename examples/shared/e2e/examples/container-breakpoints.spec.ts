import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";

test("shows two breakpoints at once, each from its own grid's width", async ({
    page,
}) => {
    await openExample(page, "container-breakpoints");
    const panel = page.getByTestId("breakpoint-panel");
    const sidebar = page.getByTestId("breakpoint-sidebar");
    await expect(panel).toContainText("wide, 6 columns");
    await expect(sidebar).toContainText("narrow, 2 columns");
    // the panel narrowed, the window as it was
    await page.getByLabel("Panel width").fill("300");
    await expect(panel).toContainText("narrow, 2 columns");
    await page.getByLabel("Panel width").fill("700");
    await expect(panel).toContainText("wide, 6 columns");
    await expect(sidebar).toContainText("narrow, 2 columns");
});
