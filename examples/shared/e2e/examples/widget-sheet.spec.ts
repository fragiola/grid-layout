import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { dragAlong, middle, named } from "./helpers";

test("drags a widget up from the sheet into the grid, and brings one in from the keyboard", async ({
    page,
}) => {
    await openExample(page, "widget-sheet");
    const items = part(page, "item");
    await expect(items).toHaveCount(3);
    const from = await middle(named(page, "Add Conversion"));
    const root = await part(page, "root").boundingBox();
    await dragAlong(page, from, {
        x: (root?.x ?? 0) + (root?.width ?? 0) * 0.25,
        y: (root?.y ?? 0) + (root?.height ?? 0) + 30,
    });
    await expect(items).toHaveCount(4);
    // the widget itself, and no longer offered
    await expect(named(page, "Conversion")).toBeVisible();
    await expect(named(page, "Add Conversion")).toHaveCount(0);
    await named(page, "Add Refunds").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(5);
    await expect(named(page, "Refunds")).toBeFocused();
});
