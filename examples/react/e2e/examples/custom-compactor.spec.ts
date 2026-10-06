import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragTo, expectNoOverlap, inRoot, named } from "./helpers";

test("a widget dropped at the end of a row slides back against the last one there", async ({
    page,
}) => {
    await openExample(page, "custom-compactor");
    const revenue = await boxOf(named(page, "Revenue"));
    const orders = named(page, "Orders");
    const uptime = named(page, "Uptime");
    // settled on load: Orders slid against Revenue, Uptime to the start of its row
    expect((await boxOf(orders)).x).toBeCloseTo(
        revenue.x + revenue.width + 10,
        0,
    );
    expect((await boxOf(uptime)).x).toBeCloseTo(revenue.x, 0);

    // Uptime, dropped at the end of the first row
    const end = await inRoot(page, 0.88, 0);
    await dragTo(page, uptime, { x: end.x, y: revenue.y + revenue.height / 2 });
    const first = await boxOf(orders);
    const dropped = await boxOf(uptime);
    expect(dropped.y).toBeCloseTo(first.y, 0);
    expect(dropped.x).toBeCloseTo(first.x + first.width + 10, 0);
    await expectNoOverlap(page);
});
