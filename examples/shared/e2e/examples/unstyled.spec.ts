import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, expectNoOverlap, named } from "./helpers";

test("drags and pushes with no theme at all", async ({ page }) => {
    await openExample(page, "unstyled");
    const revenue = named(page, "Revenue");
    const visitors = await boxOf(named(page, "Visitors"));
    const start = await boxOf(revenue);
    await dragBy(page, revenue, visitors.x - start.x, 0);
    await expect
        .poll(async () => Math.round((await boxOf(revenue)).x - visitors.x))
        .toBe(0);
    await expectNoOverlap(page);
});
