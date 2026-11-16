import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, columnPitch, dragBy, named } from "./helpers";

test("refuses a move into the reserved area, puts the widget back and logs why", async ({
    page,
}) => {
    await openExample(page, "middleware");
    const log = page.getByRole("log", { name: "Refused moves" });
    const revenue = named(page, "Revenue");
    const start = await boxOf(revenue);
    // Revenue (two columns) toward the ninth column: inside the reserved area
    await dragBy(page, revenue, (await columnPitch(page)) * 9, 0);
    const end = await boxOf(revenue);
    expect(Math.abs(end.x - start.x)).toBeLessThan(2);
    expect(Math.abs(end.y - start.y)).toBeLessThan(2);
    await expect(log.getByRole("listitem")).toHaveCount(1);
    await expect(log).toContainText("Revenue to column 10, row 1");
    await expect(log).toContainText("would enter the reserved area");
});

test("refuses a fourth widget on a row, and lets an allowed move through", async ({
    page,
}) => {
    await openExample(page, "middleware");
    const log = page.getByRole("log", { name: "Refused moves" });
    const pitch = await columnPitch(page);
    const conversion = named(page, "Conversion");
    const start = await boxOf(conversion);
    // Conversion from the third row up beside Visitors: four widgets on the first row
    const visitors = await boxOf(named(page, "Visitors"));
    await dragBy(
        page,
        conversion,
        visitors.x - start.x + 2 * pitch,
        visitors.y - start.y,
    );
    expect(Math.abs((await boxOf(conversion)).y - start.y)).toBeLessThan(2);
    await expect(log).toContainText("3 at most");
    // one row down (a row is 48px and a 10px gap), pushing Uptime: allowed, nothing logged
    await dragBy(page, conversion, 0, 58);
    expect((await boxOf(conversion)).y).toBeGreaterThan(start.y + 30);
    await expect(log.getByRole("listitem")).toHaveCount(1);
});
