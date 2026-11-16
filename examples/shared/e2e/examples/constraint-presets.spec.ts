import { expect, type Page, test } from "@playwright/test";
import { openExample } from "../helpers";
import { columnPitch, dragBy, keyGesture, named } from "./helpers";

const DOWN_TEN = Array.from({ length: 10 }, () => "ArrowDown");

async function choose(page: Page, preset: string) {
    const button = page.getByRole("button", { name: preset, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
}

test("gridBounds stops a move at maxRows; boundedX lets it go below, until compaction lifts it", async ({
    page,
}) => {
    await openExample(page, "constraint-presets");
    const e = named(page, "Item E");
    await keyGesture(page, e, DOWN_TEN);
    // maxRows is 8 and E is 2 rows tall
    await expect(e.getByText("x 9, y 6", { exact: true })).toBeVisible();
    await choose(page, "Bounded X");
    await keyGesture(page, e, DOWN_TEN);
    await expect(e.getByText("x 9, y 10", { exact: true })).toBeVisible();
    await page.getByRole("switch", { name: "Vertical compaction" }).click();
    await expect(e.getByText("x 9, y 0", { exact: true })).toBeVisible();
});

test("containerBounds stops a move at the rows the grid shows", async ({
    page,
}) => {
    await openExample(page, "constraint-presets");
    await choose(page, "Container");
    const e = named(page, "Item E");
    await keyGesture(page, e, DOWN_TEN);
    // the root shows 5 rows
    await expect(e.getByText("x 9, y 3", { exact: true })).toBeVisible();
});

test("without minMaxSize, an item's own limits no longer stop a resize", async ({
    page,
}) => {
    await openExample(page, "constraint-presets");
    const pitch = await columnPitch(page);
    const b = named(page, "Item B");
    await dragBy(page, named(page, "Resize item B"), pitch * 4, 0);
    // maxW is 4
    await expect(b.getByText("4 × 2", { exact: true })).toBeVisible();
    await choose(page, "Grid bounds only");
    await dragBy(page, named(page, "Resize item B"), pitch * 4, 0);
    await expect(b.getByText("7 × 2", { exact: true })).toBeVisible();
});
