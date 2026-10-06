import { expect, type Locator, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, columnPitch, dragBy, named, settled } from "./helpers";

const ITEMS = [
    ["16:9 video", 16 / 9],
    ["4:3 photo", 4 / 3],
    ["1:1 square", 1],
    ["2:1 banner", 2],
] as const;

/** Whole rows hold a ratio within half a row: 20 px rows and 10 px gaps, so 15 px. */
async function expectRatio(item: Locator, ratio: number) {
    const box = await boxOf(item);
    expect(Math.abs(box.height - box.width / ratio)).toBeLessThanOrEqual(16);
}

test("every item keeps its ratio in pixels, on load and after a resize", async ({
    page,
}) => {
    await openExample(page, "aspect-ratio");
    await settled(page);
    for (const [name, ratio] of ITEMS)
        await expectRatio(named(page, name), ratio);
    const pitch = await columnPitch(page);
    const video = named(page, "16:9 video");
    await dragBy(page, named(page, "Resize 16:9 video"), pitch * 2, 0);
    await expect(video.getByText(/^6 × \d+$/)).toBeVisible();
    await expectRatio(video, 16 / 9);
    // pulled only down, the width stays and the ratio puts the height back
    const square = named(page, "1:1 square");
    const before = await boxOf(square);
    await dragBy(page, named(page, "Resize 1:1 square"), 0, 200);
    expect((await boxOf(square)).height).toBeCloseTo(before.height, 0);
    await expectRatio(square, 1);
});
