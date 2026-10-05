import { expect, test } from "@playwright/test";
import { boxOf, center, DIRS, fixture, STEP_X, touchPath } from "./helpers";

// Touch input on a phone (Chromium's real touch, WebKit's touch pointer events): a drag handle
// and a resize handle take a touch drag, their `touch-action: none` keeping the page from
// scrolling (D7). The fixture is wider than a phone: the viewport is too.

test.use({ viewport: { width: 1280, height: 900 } });

for (const dir of DIRS) {
    test(`a touch drag on a drag handle and a resize handle (${dir})`, async ({
        page,
    }) => {
        await page.goto(fixture(dir));
        const touch = async (selector: string, cols: number) => {
            const from = await center(page.getByTestId(selector));
            const sign = dir === "rtl" ? -1 : 1;
            await touchPath(page, [
                from,
                { x: from.x + sign * cols * STEP_X, y: from.y },
            ]);
        };
        await touch("handle-c", 4);
        await expect.poll(() => boxOf(page, "c")).toMatchObject({ x: 8, y: 0 });
        await touch("resize-a-end", 1);
        await expect.poll(() => boxOf(page, "a")).toMatchObject({ w: 3 });
    });
}
