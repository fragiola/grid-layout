import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragTo, inRoot, named } from "./helpers";

test("refuses the locked columns and a second clock, and shrinks a banner to fit", async ({
    page,
}) => {
    await openExample(page, "drop-rules");
    const items = part(page, "item");
    const root = part(page, "root");
    const status = page.getByRole("status");
    await expect(items).toHaveCount(1);
    // into the locked columns: refused, shown refused, nothing added
    await dragTo(
        page,
        named(page, "KPI, anywhere free"),
        await inRoot(page, 0.9, 0.2),
        {
            release: false,
        },
    );
    await expect(root).toHaveAttribute("data-drop-refused", "");
    await expect(part(page, "placeholder")).toHaveCount(0);
    await expect(status).toHaveText("The last three columns are locked.");
    await page.mouse.up();
    await expect(items).toHaveCount(1);
    // one clock, then no second
    await dragTo(
        page,
        named(page, "Clock, one at most"),
        await inRoot(page, 0.45, 0.2),
    );
    await expect(items).toHaveCount(2);
    await dragTo(
        page,
        named(page, "Clock, one at most"),
        await inRoot(page, 0.3, 0.7),
        {
            release: false,
        },
    );
    await expect(status).toHaveText("One clock at most.");
    await page.mouse.up();
    await expect(items).toHaveCount(2);
    // a banner nine columns wide, from the third column: it ends where the lock starts
    await dragTo(
        page,
        named(page, "Banner, shrinks to fit"),
        await inRoot(page, 0.55, 0.85),
    );
    await expect(items).toHaveCount(3);
    const banner = await boxOf(items.filter({ hasText: /banner/i }));
    const box = await boxOf(root);
    expect(banner.x + banner.width).toBeLessThan(box.x + box.width * 0.76);
});

test("from the keyboard: a widget comes in where the rules allow", async ({
    page,
}) => {
    await openExample(page, "drop-rules");
    const items = part(page, "item");
    await named(page, "KPI, anywhere free").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText("Allowed here.");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(2);
    await expect(named(page, "kpi 1")).toBeFocused();
});
