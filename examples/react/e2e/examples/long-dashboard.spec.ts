import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, middle, named, settled } from "./helpers";

test("a widget held at the frame's bottom edge scrolls it, and lands far down", async ({
    page,
}) => {
    await openExample(page, "long-dashboard");
    const frame = page.getByTestId("scroller");
    const box = await boxOf(frame);
    const from = await middle(named(page, "Revenue"));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, box.y + box.height - 8, { steps: 10 });
    await expect
        .poll(() => frame.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(300);
    await page.mouse.up();
    await settled(page);
    // the grid scrolled under it: it lands rows below where it started
    const revenue = named(page, "Revenue");
    const root = page
        .getByTestId("stage")
        .locator('[data-grid-layout-part="root"]');
    const down = await revenue.evaluate(
        (element, grid) =>
            element.getBoundingClientRect().top -
            (grid?.getBoundingClientRect().top ?? 0),
        await root.elementHandle(),
    );
    expect(down).toBeGreaterThan(300);
});

test("a corner pulled to the frame's bottom edge scrolls it and grows the widget", async ({
    page,
}) => {
    await openExample(page, "long-dashboard");
    const frame = page.getByTestId("scroller");
    const box = await boxOf(frame);
    const widget = named(page, "Revenue");
    const start = await boxOf(widget);
    const corner = await middle(named(page, "Resize Revenue"));
    await page.mouse.move(corner.x, corner.y);
    await page.mouse.down();
    await page.mouse.move(corner.x, box.y + box.height - 8, { steps: 10 });
    await expect
        .poll(() => frame.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(100);
    await page.mouse.up();
    await expect
        .poll(async () => (await boxOf(widget)).height)
        .toBeGreaterThan(start.height + 100);
});
