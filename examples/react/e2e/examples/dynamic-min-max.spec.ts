import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { columnPitch, dragBy, keyGesture, named } from "./helpers";

test("an item grows taller than 2 rows only once 4 columns wide", async ({
    page,
}) => {
    await openExample(page, "dynamic-min-max");
    const a = named(page, "Item A");
    await dragBy(page, named(page, "Resize item A"), 0, 200);
    await expect(a.getByText("3 × 2", { exact: true })).toBeVisible();
    const pitch = await columnPitch(page);
    await dragBy(page, named(page, "Resize item A"), pitch, 0);
    await expect(a.getByText("4 × 2", { exact: true })).toBeVisible();
    // rows of 48 px and gaps of 10: two rows more
    await dragBy(page, named(page, "Resize item A"), 0, 116);
    await expect(a.getByText("4 × 4", { exact: true })).toBeVisible();
    // tall now, it cannot narrow below 4 columns
    await dragBy(page, named(page, "Resize item A"), -pitch * 2, 0);
    await expect(a.getByText("4 × 4", { exact: true })).toBeVisible();
});

test("a wide item stays 1 row tall until the rule is switched off", async ({
    page,
}) => {
    await openExample(page, "dynamic-min-max");
    const e = named(page, "Item E");
    await keyGesture(page, e, ["Shift+ArrowDown", "Shift+ArrowDown"]);
    await expect(e.getByText("8 × 1", { exact: true })).toBeVisible();
    await page
        .getByRole("switch", { name: "Wider than 6 columns at 1 row tall" })
        .click();
    await keyGesture(page, e, ["Shift+ArrowDown", "Shift+ArrowDown"]);
    await expect(e.getByText("8 × 3", { exact: true })).toBeVisible();
});
