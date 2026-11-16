import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { dragTo, expectNoOverlap, inRoot, named } from "./helpers";

test("drags the note in, and brings one in from the keyboard, focused once added", async ({
    page,
}) => {
    await openExample(page, "drag-from-outside");
    const items = part(page, "item");
    const status = page.getByRole("status");
    await expect(items).toHaveCount(4);
    const source = named(page, "New note");
    await dragTo(page, source, await inRoot(page, 0.85, 0.8), {
        release: false,
    });
    await expect(part(page, "root")).toHaveAttribute("data-dropping", "");
    await expect(part(page, "drag-preview")).toBeVisible();
    await page.mouse.up();
    await expect(items).toHaveCount(5);
    await expect(status).toContainText("Note added at column");
    await expect(part(page, "drag-preview")).toHaveCount(0);
    await expectNoOverlap(page);
    // without a pointer
    await source.focus();
    await page.keyboard.press("Enter");
    await expect(status).toContainText("Note brought into the grid at column");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(6);
    await expect(named(page, "Note 2")).toBeFocused();
    await expectNoOverlap(page);
});
