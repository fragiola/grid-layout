import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { named } from "./helpers";

test("grabs, moves, resizes and drops with the keys, and says each step", async ({
    page,
}) => {
    await openExample(page, "keyboard");
    const status = page.getByRole("status");
    await named(page, "Revenue").focus();
    await page.keyboard.press("Space");
    await expect(status).toContainText("Revenue grabbed at column 1, row 1");
    await expect(named(page, "Revenue")).toHaveAttribute("data-grabbed", "");
    await page.keyboard.press("ArrowRight");
    await expect(status).toContainText("Revenue moved to column 2, row 1");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(status).toContainText("3 rows tall");
    await page.keyboard.press("Enter");
    await expect(status).toContainText(
        "Revenue dropped at column 2, row 1, 4 columns wide, 3 rows tall",
    );
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(status).toContainText("Revenue put back at column 2, row 1");
});
