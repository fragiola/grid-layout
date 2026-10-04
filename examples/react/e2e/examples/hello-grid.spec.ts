import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, expectNoOverlap, named } from "./helpers";

test("drags a widget onto another, which moves out of the way", async ({
    page,
}) => {
    await openExample(page, "hello-grid");
    const revenue = named(page, "Revenue");
    const orders = named(page, "Orders");
    const target = await boxOf(orders);
    const start = await boxOf(revenue);
    await dragBy(page, revenue, target.x - start.x, 0);
    await expect
        .poll(async () => Math.round((await boxOf(revenue)).x - target.x))
        .toBe(0);
    expect((await boxOf(orders)).y).toBeGreaterThan(target.y);
    await expectNoOverlap(page);
});

test("resizes a widget from its corner", async ({ page }) => {
    await openExample(page, "hello-grid");
    const revenue = named(page, "Revenue");
    const before = await boxOf(revenue);
    await dragBy(
        page,
        named(page, "Resize Revenue"),
        0,
        before.height / 2 + 40,
    );
    await expect
        .poll(async () => (await boxOf(revenue)).height)
        .toBeGreaterThan(before.height);
    await expectNoOverlap(page);
});

test("takes its shape from the theme", async ({ page }) => {
    await openExample(page, "hello-grid", { theme: "paper" });
    await expect(page.getByText("Revenue", { exact: true })).toHaveCSS(
        "text-transform",
        "uppercase",
    );
});
