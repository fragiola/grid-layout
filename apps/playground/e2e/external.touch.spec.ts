import { expect, test } from "@playwright/test";
import { cellCentre, center, DIRS, externalFixture, layoutOf } from "./helpers";

// Real touch input (Chromium's, through the DevTools protocol): a drag source takes a touch drag
// past the threshold, its `touch-action: none` keeping the page from scrolling (X1). The fixture
// is wider than a phone: the viewport is too.

test.use({ viewport: { width: 1280, height: 900 } });

for (const dir of DIRS) {
    test(`a touch drag brings a source into the grid (${dir})`, async ({
        page,
    }) => {
        await page.goto(externalFixture(dir));
        const client = await page.context().newCDPSession(page);
        const from = await center(page.getByTestId("source-note"));
        const to = await cellCentre(page, dir, 6, 0, 2, 1);
        const point = (step: number) => ({
            x: from.x + ((to.x - from.x) * step) / 10,
            y: from.y + ((to.y - from.y) * step) / 10,
        });
        await client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [point(0)],
        });
        for (let step = 1; step <= 10; step++) {
            await client.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [point(step)],
            });
        }
        await client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        await expect
            .poll(async () =>
                (await layoutOf(page)).find(
                    (item) => !["a", "b", "c"].includes(item.id),
                ),
            )
            .toMatchObject({ x: 6, y: 0, w: 2, h: 1 });
    });
}
