import { expect, type Page, test } from "@playwright/test";
import { boxOf, center, changes, touchPath } from "./helpers";

// The mobile fixture on a phone (the `mobile` project, and WebKit's iPhone in its own job): a
// swipe on an item's body scrolls the page, a long press drags it, a handle drags at once, and a
// drag source drops on touch (Epic #13, R5).

async function open(page: Page) {
    await page.goto("/fixtures/mobile/");
    await page.getByTestId("grid").scrollIntoViewIfNeeded();
}

test("a short swipe on an item's body scrolls the page and does not drag", async ({
    page,
    browserName,
}) => {
    // only Chromium's real touch input scrolls the page
    test.skip(browserName !== "chromium", "synthetic touch never scrolls");
    await open(page);
    const before = await page.evaluate(() => scrollY);
    const at = await center(page.getByTestId("item-a"));
    await touchPath(page, [at, { x: at.x, y: at.y - 200 }], { steps: 6 });
    await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(before + 50);
    expect(await changes(page)).toBe(0);
    expect(await boxOf(page, "a")).toMatchObject({ x: 0, y: 0 });
});

test("a long press then a move drags the item, the page still", async ({
    page,
}) => {
    await open(page);
    const before = await page.evaluate(() => scrollY);
    const a = await center(page.getByTestId("item-a"));
    const b = await center(page.getByTestId("item-b"));
    await touchPath(page, [a, { x: b.x + 20, y: a.y }], {
        hold: 450,
        steps: 10,
    });
    await expect.poll(() => boxOf(page, "a")).toMatchObject({ x: 2, y: 0 });
    expect(await changes(page)).toBe(1);
    expect(
        Math.abs((await page.evaluate(() => scrollY)) - before),
    ).toBeLessThan(5);
});

test("shows the hold before it drags", async ({ page }) => {
    await open(page);
    const a = await center(page.getByTestId("item-a"));
    const holding = touchPath(page, [a, { x: a.x + 2, y: a.y }], { hold: 600 });
    await expect(page.getByTestId("item-a")).toHaveAttribute(
        "data-pressing",
        "",
    );
    await holding;
    await expect(page.getByTestId("item-a")).not.toHaveAttribute(
        "data-pressing",
        "",
    );
});

test("a drag handle drags at once", async ({ page }) => {
    await open(page);
    const handle = await center(page.getByTestId("handle-h"));
    const top = await center(page.getByTestId("item-a"));
    await touchPath(page, [handle, { x: handle.x, y: top.y - 40 }], {
        steps: 10,
    });
    await expect.poll(() => boxOf(page, "h")).toMatchObject({ y: 0 });
});

test("a drag source drops on touch", async ({ page }) => {
    await open(page);
    await page.getByTestId("source").scrollIntoViewIfNeeded();
    const from = await center(page.getByTestId("source"));
    const grid = await page.getByTestId("grid").boundingBox();
    const to = {
        x: (grid?.x ?? 0) + (grid?.width ?? 0) * 0.25,
        y: (grid?.y ?? 0) + (grid?.height ?? 0) - 30,
    };
    await touchPath(page, [from, to], { steps: 12 });
    await expect.poll(() => boxOf(page, "new")).toBeDefined();
});
