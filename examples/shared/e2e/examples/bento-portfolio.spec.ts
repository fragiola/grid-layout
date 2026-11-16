import { expect, type Locator, test } from "@playwright/test";
import { openExample } from "../helpers";
import {
    boxOf,
    columnPitch,
    dragBy,
    expectNoOverlap,
    named,
    settled,
} from "./helpers";

/** Whole rows hold a ratio within half a row: 20 px rows and 10 px gaps, so 15 px. */
async function expectRatio(item: Locator, ratio: number) {
    const box = await boxOf(item);
    expect(Math.abs(box.height - box.width / ratio)).toBeLessThanOrEqual(16);
}

test("a picture keeps its ratio as it is resized", async ({ page }) => {
    await openExample(page, "bento-portfolio");
    await settled(page);
    const harbor = named(page, "Harbor");
    await expectRatio(harbor, 16 / 9);
    await expectRatio(named(page, "Fieldnotes"), 3 / 4);
    await expectRatio(named(page, "Tide"), 1);
    const before = await boxOf(harbor);
    const pitch = await columnPitch(page);
    await dragBy(page, named(page, "Resize Harbor"), -pitch * 2, 0);
    const after = await boxOf(harbor);
    expect(after.width).toBeLessThan(before.width - pitch);
    expect(after.height).toBeLessThan(before.height);
    await expectRatio(harbor, 16 / 9);
    // pulled only down, the ratio puts the height back
    const tide = named(page, "Tide");
    const square = await boxOf(tide);
    await dragBy(page, named(page, "Resize Tide"), 0, 150);
    expect((await boxOf(tide)).height).toBeCloseTo(square.height, 0);
    await expectRatio(tide, 1);
    await expectNoOverlap(page);
});

test("the hero is pinned: it neither moves nor gives way", async ({ page }) => {
    await openExample(page, "bento-portfolio");
    await settled(page);
    const hero = named(page, "Introduction");
    await expect(hero).toHaveAttribute("data-static", "");
    const pinned = await boxOf(hero);
    await dragBy(page, hero, 300, 120);
    expect(await boxOf(hero)).toEqual(pinned);
    const tide = named(page, "Tide");
    const start = await boxOf(tide);
    await dragBy(page, tide, pinned.x - start.x + 20, pinned.y - start.y + 20);
    expect(await boxOf(hero)).toEqual(pinned);
    await expectNoOverlap(page);
});
