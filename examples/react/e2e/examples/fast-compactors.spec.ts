import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragBy, named } from "./helpers";

test("settles a thousand tiles with either compactor, timed, and still drags", async ({
    page,
}) => {
    await openExample(page, "fast-compactors");
    await expect(part(page, "item")).toHaveCount(1000);
    const timing = page.getByRole("status", { name: "Last compaction" });
    for (const name of ["Vertical", "Fast vertical"]) {
        await page.getByRole("button", { name, exact: true }).click();
        await expect(
            page.getByRole("button", { name, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(timing).toHaveText(/^\d+\.\d ms$/);
    }
    await expect(part(page, "item")).toHaveCount(1000);

    const tile = named(page, "Tile 1");
    const start = await boxOf(tile);
    await dragBy(page, tile, 0, 120);
    expect((await boxOf(tile)).y).toBeGreaterThan(start.y + 60);
    await expect(timing).toHaveText(/^\d+\.\d ms$/);
});
