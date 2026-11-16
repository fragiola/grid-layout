import { expect, type Page, test } from "@playwright/test";
import { openExample } from "../helpers";
import { columnPitch, dragBy, keyGesture, named } from "./helpers";

async function choose(page: Page, rule: string) {
    const button = page.getByRole("button", { name: rule, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
}

test("snapToGrid(3) lands moves on multiples of 3, by pointer and keyboard", async ({
    page,
}) => {
    await openExample(page, "custom-constraints");
    await choose(page, "Snap to 3");
    const pitch = await columnPitch(page);
    const a = named(page, "Item A");
    // two columns to the end: the nearest multiple of 3 is 3
    await dragBy(page, a, pitch * 2, 0);
    await expect(a.getByText("x 3, y 0", { exact: true })).toBeVisible();
    // one arrow skips to the next place the rule allows
    await keyGesture(page, a, ["ArrowRight"]);
    await expect(a.getByText("x 6, y 0", { exact: true })).toBeVisible();
});

test("a maximum area caps a resize", async ({ page }) => {
    await openExample(page, "custom-constraints");
    await choose(page, "Area ≤ 12");
    const f = named(page, "Item F");
    await expect(f.getByText("4 × 2", { exact: true })).toBeVisible();
    await keyGesture(page, f, [
        "Shift+ArrowRight",
        "Shift+ArrowRight",
        "Shift+ArrowRight",
        "Shift+ArrowRight",
    ]);
    await expect(f.getByText("6 × 2", { exact: true })).toBeVisible();
});

test("even columns only", async ({ page }) => {
    await openExample(page, "custom-constraints");
    await choose(page, "Even columns");
    const e = named(page, "Item E");
    await keyGesture(page, e, ["ArrowLeft"]);
    await expect(e.getByText("x 8, y 0", { exact: true })).toBeVisible();
});
