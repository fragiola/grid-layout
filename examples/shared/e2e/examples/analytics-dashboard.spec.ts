import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named, settled } from "./helpers";

test("a filter changes its chart without moving the widget", async ({
    page,
}) => {
    await openExample(page, "analytics-dashboard");
    await settled(page);
    const traffic = named(page, "Traffic");
    const before = await boxOf(traffic);
    const chart = traffic.getByRole("img");
    await expect(chart).toHaveAttribute("aria-label", /last 30 days/);
    const line = await chart.locator("path").last().getAttribute("d");
    await traffic.getByRole("button", { name: "90d" }).click();
    await expect(chart).toHaveAttribute("aria-label", /last 90 days/);
    await expect(traffic.getByRole("button", { name: "90d" })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    expect(await chart.locator("path").last().getAttribute("d")).not.toBe(line);
    // the select is a native control too: it changes the bars, and the widget stays
    const channels = named(page, "Channels");
    const channelsBox = await boxOf(channels);
    await channels
        .getByRole("combobox", { name: "Metric" })
        .selectOption("revenue");
    await expect(channels.getByRole("list")).toHaveAttribute(
        "aria-label",
        "Revenue by channel",
    );
    await settled(page);
    expect(await boxOf(traffic)).toEqual(before);
    expect(await boxOf(channels)).toEqual(channelsBox);
    // pressing a filter is never a drag: the layout did not change, nothing was saved
    await expect(page.getByRole("status")).toHaveText("");
});

test("a widget moves by its header's grip, and the layout survives a reload", async ({
    page,
}) => {
    await openExample(page, "analytics-dashboard");
    await settled(page);
    const revenue = named(page, "Revenue");
    const conversion = await boxOf(named(page, "Conversion"));
    const start = await boxOf(revenue);
    // the body does not drag: the widget has a handle
    await dragBy(page, revenue, conversion.x - start.x, 0, {
        at: { x: start.x + start.width / 2, y: start.y + start.height - 12 },
    });
    expect(await boxOf(revenue)).toEqual(start);
    await dragBy(page, named(page, "Move Revenue"), conversion.x - start.x, 0);
    await expect(page.getByRole("status")).toHaveText("Layout saved");
    const moved = await boxOf(revenue);
    expect(moved.x).toBeGreaterThan(start.x + 100);
    await page.reload();
    await expect(page.getByRole("status")).toHaveText("Restored your layout");
    await settled(page);
    expect(Math.round((await boxOf(revenue)).x)).toBe(Math.round(moved.x));
    await page.getByRole("button", { name: "Reset layout" }).click();
    await expect
        .poll(async () => Math.round((await boxOf(revenue)).x))
        .toBe(Math.round(start.x));
});
