import { expect, test } from "@playwright/test";
import {
    cellCentre,
    center,
    DIRS,
    externalFixture,
    layoutOf,
    touchPath,
} from "./helpers";

// Touch input on a phone: a drag source takes a touch drag past the threshold, its
// `touch-action: none` keeping the page from scrolling (X1). The fixture is wider than a phone:
// the viewport is too.

test.use({ viewport: { width: 1280, height: 900 } });

for (const dir of DIRS) {
    test(`a touch drag brings a source into the grid (${dir})`, async ({
        page,
    }) => {
        await page.goto(externalFixture(dir));
        const from = await center(page.getByTestId("source-note"));
        const to = await cellCentre(page, dir, 6, 0, 2, 1);
        await touchPath(page, [from, to], { steps: 10 });
        await expect
            .poll(async () =>
                (await layoutOf(page)).find(
                    (item) => !["a", "b", "c"].includes(item.id),
                ),
            )
            .toMatchObject({ x: 6, y: 0, w: 2, h: 1 });
    });
}
