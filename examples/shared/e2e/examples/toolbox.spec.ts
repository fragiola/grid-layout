import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { dragTo, expectNoOverlap, inRoot, named } from "./helpers";

test("puts a widget away by dragging it out, and drags it back in", async ({
    page,
}) => {
    await openExample(page, "toolbox");
    const items = part(page, "item");
    const toolbox = page.getByRole("region", { name: "Toolbox" });
    await expect(items).toHaveCount(6);
    const box = await toolbox.boundingBox();
    await dragTo(page, named(page, "Orders"), {
        x: (box?.x ?? 0) + (box?.width ?? 0) * 0.6,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    });
    await expect(items).toHaveCount(5);
    await expect(named(page, "Orders")).toHaveCount(0);
    const stowed = named(page, "Orders, in the toolbox");
    await expect(stowed).toBeVisible();
    await dragTo(page, stowed, await inRoot(page, 0.5, 0.85));
    await expect(items).toHaveCount(6);
    await expect(named(page, "Orders")).toBeVisible();
    await expect(stowed).toHaveCount(0);
    await expectNoOverlap(page);
});

test("from the keyboard: a button puts a widget away, Enter brings it back", async ({
    page,
}) => {
    await openExample(page, "toolbox");
    const items = part(page, "item");
    await named(page, "Put Visitors in the toolbox").focus();
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(5);
    await named(page, "Visitors, in the toolbox").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(6);
    await expect(named(page, "Visitors")).toBeFocused();
    await expectNoOverlap(page);
});
