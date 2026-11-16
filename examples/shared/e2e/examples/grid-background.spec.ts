import { expect, type Locator, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { dragBy, named, settled } from "./helpers";

const opacity = (cell: Locator) =>
    cell.evaluate((el) => Number(getComputedStyle(el).opacity));

test("draws a cell per column and row, shown only while an item is held", async ({
    page,
}) => {
    await openExample(page, "grid-background");
    const cells = part(page, "cell");
    // 12 columns, down to the layout's bottom (row 4) plus one
    await expect(cells).toHaveCount(12 * 5);
    await expect(cells.last()).toHaveAttribute("data-x", "11");
    await expect(cells.last()).toHaveAttribute("data-y", "4");
    await settled(page);
    expect(await opacity(cells.first())).toBe(0);

    await dragBy(page, named(page, "Revenue"), 0, 140, { release: false });
    await expect(part(page, "root")).toHaveAttribute("data-dragging", "");
    await expect.poll(() => opacity(cells.first())).toBeGreaterThan(0);

    await page.mouse.up();
    await expect(part(page, "root")).not.toHaveAttribute("data-dragging");
    await expect.poll(() => opacity(cells.first())).toBe(0);
});
