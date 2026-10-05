import { expect, type Page, test } from "@playwright/test";
import { boxOf, center } from "./helpers";

// The auto-scroll fixture: a grid far taller than its 300px scroll container. A move, a resize
// and a drop held near its bottom edge scroll it to the end, and stop once the pointer leaves the
// edge (Epic #13, R6).

const scrollTop = (page: Page) =>
    page.getByTestId("scroller").evaluate((element) => element.scrollTop);
const scrollEnd = (page: Page) =>
    page
        .getByTestId("scroller")
        .evaluate((element) => element.scrollHeight - element.clientHeight);

/** A point just inside the scroller's bottom edge, `x` pixels from its start. */
async function bottomEdge(page: Page, x = 150) {
    const box = await page.getByTestId("scroller").boundingBox();
    return { x: (box?.x ?? 0) + x, y: (box?.y ?? 0) + (box?.height ?? 0) - 6 };
}

test("a drag held at the bottom edge scrolls to the end, and stops off the edge", async ({
    page,
}) => {
    await page.goto("/fixtures/autoscroll/");
    const from = await center(page.getByTestId("item-a"));
    // over the tall column: where it lands, nothing lifts it back to the top
    const edge = await bottomEdge(page, 560);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(edge.x, edge.y, { steps: 8 });
    const end = await scrollEnd(page);
    await expect
        .poll(() => scrollTop(page), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(end);
    // at the end of the grid it stops, the pointer still at the edge
    const last = await scrollTop(page);
    await page.waitForTimeout(300);
    expect(await scrollTop(page)).toBe(last);
    // off the edge: it holds still
    await page.mouse.move(edge.x, edge.y - 120, { steps: 4 });
    const still = await scrollTop(page);
    await page.waitForTimeout(300);
    expect(await scrollTop(page)).toBe(still);
    // back at the edge, below the column: it lands at the end of the grid
    await page.mouse.move(edge.x, edge.y, { steps: 2 });
    await page.mouse.up();
    await expect
        .poll(async () => (await boxOf(page, "a"))?.y)
        .toBeGreaterThan(20);
});

test("a resize held at the bottom edge scrolls, and grows the item", async ({
    page,
}) => {
    await page.goto("/fixtures/autoscroll/");
    const from = await center(page.getByTestId("resize-a"));
    const edge = await bottomEdge(page);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, edge.y, { steps: 8 });
    await expect.poll(() => scrollTop(page)).toBeGreaterThan(200);
    await page.mouse.up();
    await expect
        .poll(async () => (await boxOf(page, "a"))?.h)
        .toBeGreaterThan(5);
});

test("a drop from a drag source held at the bottom edge scrolls", async ({
    page,
}) => {
    await page.goto("/fixtures/autoscroll/");
    const from = await center(page.getByTestId("source"));
    const edge = await bottomEdge(page);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(edge.x, edge.y - 10, { steps: 10 });
    await expect.poll(() => scrollTop(page)).toBeGreaterThan(200);
    await page.mouse.up();
    // where it lands, compaction lifts it: it is in
    await expect.poll(() => boxOf(page, "new")).toBeDefined();
});
