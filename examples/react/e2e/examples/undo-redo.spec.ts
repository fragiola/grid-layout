import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { columnPitch, dragBy, dragTo, inRoot, named, settled } from "./helpers";

test("undoes a drag, a resize, a drop and a generated breakpoint layout", async ({
    page,
}) => {
    await openExample(page, "undo-redo");
    const undo = page.getByRole("button", { name: "Undo" });
    const redo = page.getByRole("button", { name: "Redo" });
    const revenue = named(page, "Revenue");
    const pitch = await columnPitch(page);
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    // a drag
    await dragBy(page, revenue, pitch * 4, 0);
    await expect(revenue).toContainText("x 4 · y 0");
    await undo.click();
    await expect(revenue).toContainText("x 0 · y 0");
    await redo.click();
    await expect(revenue).toContainText("x 4 · y 0");
    await undo.click();
    await expect(revenue).toContainText("x 0 · y 0");

    // a resize, once Revenue is back in place (items glide)
    await settled(page);
    await dragBy(page, page.getByLabel("Resize Revenue"), pitch * 2, 0);
    await expect(revenue).toContainText("6 × 2");
    // a new change drops what was undone
    await expect(redo).toBeDisabled();
    await undo.click();
    await expect(revenue).toContainText("4 × 2");

    // a drop from the sidebar
    const items = part(page, "item");
    await expect(items).toHaveCount(5);
    await dragTo(page, named(page, "New note"), await inRoot(page, 0.5, 0.9));
    await expect(items).toHaveCount(6);
    await undo.click();
    await expect(items).toHaveCount(5);

    // a breakpoint's layout, generated when the grid first is narrow
    const layouts = page.getByTestId("layouts");
    await expect(layouts).toHaveText("wide");
    const narrow = page.getByRole("button", { name: "Narrow grid" });
    await narrow.click();
    await expect(page.getByTestId("breakpoint")).toHaveText(
        "narrow, 4 columns",
    );
    await expect(layouts).toHaveText("wide, narrow");
    await narrow.click();
    await expect(page.getByTestId("breakpoint")).toHaveText("wide, 12 columns");
    await undo.click();
    await expect(layouts).toHaveText("wide");
    await redo.click();
    await expect(layouts).toHaveText("wide, narrow");
});

test("Ctrl+Z undoes and Shift+Ctrl+Z redoes", async ({ page }) => {
    await openExample(page, "undo-redo");
    const revenue = named(page, "Revenue");
    await dragBy(page, revenue, (await columnPitch(page)) * 4, 0);
    await expect(revenue).toContainText("x 4 · y 0");
    await page.keyboard.press("Control+z");
    await expect(revenue).toContainText("x 0 · y 0");
    await page.keyboard.press("Control+Shift+z");
    await expect(revenue).toContainText("x 4 · y 0");
    await expect(page.getByRole("list", { name: "History" })).toContainText(
        "Move Revenue",
    );
});
