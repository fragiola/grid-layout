import { expect, type Locator, type Page, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, expectNoOverlap, named, settled } from "./helpers";

// The live dashboard: its values come from a seeded simulation that ticks twice a second, so
// every assertion on a value is made on a paused feed, or waits for a change.

const pause = (page: Page) =>
    page.getByRole("button", { name: "Pause live data" });
const play = (page: Page) =>
    page.getByRole("button", { name: "Play live data" });

/** The simulated clock in the pinned header. */
const clock = (page: Page) => named(page, "Shift").locator("time");

/** A chart's drawn width: its viewBox's. */
async function drawnWidth(chart: Locator): Promise<number> {
    const viewBox = (await chart.getAttribute("viewBox")) ?? "";
    return Number(viewBox.split(" ")[2]);
}

test("values move while it plays and stop on Pause", async ({ page }) => {
    await openExample(page, "fulfillment-center");
    await expect(pause(page)).toBeVisible();
    const kpi = named(page, "Orders per minute");
    const before = await clock(page).textContent();
    await expect.poll(() => clock(page).textContent()).not.toBe(before);
    await pause(page).click();
    await expect(play(page)).toBeVisible();
    await expect(named(page, "Shift")).toContainText("Paused");
    const frozen = await clock(page).textContent();
    const figure = await kpi.textContent();
    await page.waitForTimeout(1500);
    await expect(clock(page)).toHaveText(frozen ?? "");
    await expect(kpi).toHaveText(figure ?? "");
    // and Play goes on
    await play(page).click();
    await expect.poll(() => clock(page).textContent()).not.toBe(frozen);
});

test("under reduced motion the feed starts paused", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openExample(page, "fulfillment-center");
    await expect(play(page)).toBeVisible();
    const start = await clock(page).textContent();
    await page.waitForTimeout(1200);
    await expect(clock(page)).toHaveText(start ?? "");
});

test("the throughput chart redraws to its tile's size as it keeps updating", async ({
    page,
}) => {
    await openExample(page, "fulfillment-center");
    await settled(page);
    const chart = page.getByRole("img", {
        name: "Orders received and shipped per minute",
    });
    const wide = await drawnWidth(chart);
    expect(wide).toBeGreaterThan(200);
    // drawn at its box's size, not stretched
    expect(Math.abs(wide - (await boxOf(chart)).width)).toBeLessThanOrEqual(1);
    const corner = await boxOf(named(page, "Resize Throughput"));
    await page.mouse.move(
        corner.x + corner.width / 2,
        corner.y + corner.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(corner.x - 260, corner.y + 40, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => drawnWidth(chart)).toBeLessThan(wide - 150);
    // still ticking
    const at = await clock(page).textContent();
    await expect.poll(() => clock(page).textContent()).not.toBe(at);
    await pause(page).click();
    await settled(page);
    expect(
        Math.abs((await drawnWidth(chart)) - (await boxOf(chart)).width),
    ).toBeLessThanOrEqual(1);
    await expectNoOverlap(page);
});

test("a critical alert grows its tile, and acknowledging it settles the layout back", async ({
    page,
}) => {
    // paused at first: the boxes before the alert are measured on a still dashboard
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openExample(page, "fulfillment-center");
    await settled(page);
    const alerts = named(page, "Alerts");
    const docks = named(page, "Dock doors");
    const small = await boxOf(alerts);
    const docksAt = await boxOf(docks);
    await play(page).click();
    const acknowledge = page.getByRole("button", { name: "Acknowledge" });
    await expect(acknowledge).toBeVisible({ timeout: 15_000 });
    await pause(page).click();
    await expect(page.getByRole("alert")).toContainText("Conveyor 2 jammed");
    await settled(page);
    const grown = await boxOf(alerts);
    expect(grown.height).toBeGreaterThan(small.height + 100);
    // the tile below was pushed down
    expect((await boxOf(docks)).y).toBeGreaterThan(docksAt.y + 100);
    await expectNoOverlap(page);
    await acknowledge.click();
    await expect(acknowledge).toBeHidden();
    await settled(page);
    expect((await boxOf(alerts)).height).toBeCloseTo(small.height, 0);
    expect((await boxOf(docks)).y).toBeCloseTo(docksAt.y, 0);
    await expectNoOverlap(page);
});
