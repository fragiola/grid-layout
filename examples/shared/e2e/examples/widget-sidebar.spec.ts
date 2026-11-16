import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragTo, expectNoOverlap, inRoot, named } from "./helpers";

test("drags a widget in from the sidebar, at its own size", async ({
    page,
}) => {
    await openExample(page, "widget-sidebar");
    const items = part(page, "item");
    await expect(items).toHaveCount(2);
    await dragTo(
        page,
        named(page, "Table widget, 6 by 4"),
        await inRoot(page, 0.5, 0.75),
    );
    await expect(items).toHaveCount(3);
    await expect(page.getByRole("status")).toContainText(
        "Table added at column",
    );
    const root = await boxOf(part(page, "root"));
    const table = await boxOf(named(page, "Table 3"));
    // six of twelve columns: about half the root
    expect(table.width / root.width).toBeGreaterThan(0.45);
    expect(table.width / root.width).toBeLessThan(0.55);
    await expectNoOverlap(page);
});

test("brings a widget in from the keyboard and says each step", async ({
    page,
}) => {
    await openExample(page, "widget-sidebar");
    const items = part(page, "item");
    const status = page.getByRole("status");
    const notes = named(page, "Notes widget, 3 by 3");
    await notes.focus();
    await page.keyboard.press("Enter");
    await expect(notes).toHaveAttribute("data-grabbed", "");
    await expect(status).toContainText(
        "Notes brought into the grid at column 10, row 1",
    );
    await page.keyboard.press("ArrowLeft");
    await expect(status).toContainText("Notes moved to column 9, row 1");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(status).toContainText("4 rows tall");
    await expect(items).toHaveCount(2);
    await page.keyboard.press("Enter");
    await expect(status).toContainText("Notes added at column 9, row 1");
    await expect(items).toHaveCount(3);
    await expect(named(page, "Notes 3")).toBeFocused();
    // Escape leaves it out
    await named(page, "KPI widget, 3 by 2").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(status).toContainText("KPI not added.");
    await expect(items).toHaveCount(3);
});
