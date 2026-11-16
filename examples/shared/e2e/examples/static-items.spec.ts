import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, expectNoOverlap, named } from "./helpers";

test("a pinned widget stays put, dragged or landed on", async ({ page }) => {
    await openExample(page, "static-items");
    const uptime = named(page, "Uptime");
    await expect(uptime).toHaveAttribute("data-static", "");
    const pinned = await boxOf(uptime);
    await dragBy(page, uptime, -300, 80);
    expect(await boxOf(uptime)).toEqual(pinned);
    const revenue = named(page, "Revenue");
    const start = await boxOf(revenue);
    await dragBy(page, revenue, pinned.x - start.x, pinned.y - start.y);
    expect(await boxOf(uptime)).toEqual(pinned);
    await expectNoOverlap(page);
});
