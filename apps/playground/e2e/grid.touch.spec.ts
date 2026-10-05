import { expect, test } from "@playwright/test";
import { boxOf, center, DIRS, fixture, STEP_X } from "./helpers";

// Real touch input (Chromium's, through the DevTools protocol): a drag handle and a resize
// handle take a touch drag, their `touch-action: none` keeping the page from scrolling (D7).

for (const dir of DIRS) {
    test(`a touch drag on a drag handle and a resize handle (${dir})`, async ({
        page,
    }) => {
        await page.goto(fixture(dir));
        const client = await page.context().newCDPSession(page);
        const touch = async (selector: string, cols: number) => {
            const from = await center(page.getByTestId(selector));
            const sign = dir === "rtl" ? -1 : 1;
            const point = (step: number) => ({
                x: from.x + (sign * cols * STEP_X * step) / 8,
                y: from.y,
            });
            await client.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [point(0)],
            });
            for (let step = 1; step <= 8; step++) {
                await client.send("Input.dispatchTouchEvent", {
                    type: "touchMove",
                    touchPoints: [point(step)],
                });
            }
            await client.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: [],
            });
        };
        await touch("handle-c", 4);
        await expect.poll(() => boxOf(page, "c")).toMatchObject({ x: 8, y: 0 });
        await touch("resize-a-end", 1);
        await expect.poll(() => boxOf(page, "a")).toMatchObject({ w: 3 });
    });
}
