import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragTo, expectNoOverlap, inRoot, named } from "./helpers";

test("builds a dashboard: a widget in, one in the trash, saved, and reset", async ({
    page,
}) => {
    await openExample(page, "dashboard-builder");
    const items = part(page, "item");
    await expect(items).toHaveCount(3);
    await dragTo(
        page,
        named(page, "Table widget"),
        await inRoot(page, 0.5, 0.8),
    );
    await expect(items).toHaveCount(4);
    await expect(page.getByRole("status")).toContainText(
        "Table added at column",
    );
    await expectNoOverlap(page);
    // released over the trash: removed
    const trash = await boxOf(
        page.getByTestId("stage").getByText("Drop here to remove"),
    );
    await dragTo(page, named(page, "Notes 1"), {
        x: trash.x + trash.width / 2,
        y: trash.y + trash.height / 2,
    });
    await expect(items).toHaveCount(3);
    await expect(named(page, "Notes 1")).toHaveCount(0);
    // saved as it goes
    await page.reload();
    await expect(items).toHaveCount(3);
    await expect(named(page, "Table 1")).toBeVisible();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(named(page, "Notes 1")).toBeVisible();
    await expect(named(page, "Table 1")).toHaveCount(0);
});

test("from the keyboard: a widget comes in, focused, and a button removes it", async ({
    page,
}) => {
    await openExample(page, "dashboard-builder");
    const items = part(page, "item");
    await named(page, "Table widget").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(4);
    await expect(named(page, "Table 1")).toBeFocused();
    await named(page, "Remove Table 1").click();
    await expect(items).toHaveCount(3);
});
