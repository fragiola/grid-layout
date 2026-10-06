import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, expectNoOverlap, named, settled } from "./helpers";

test("every tile says its status in words, not colour alone", async ({
    page,
}) => {
    await openExample(page, "ops-monitor");
    await expect(named(page, "Payments")).toContainText("Down");
    await expect(named(page, "Payments")).toHaveAttribute(
        "data-status",
        "down",
    );
    await expect(named(page, "Search")).toContainText("Degraded");
    await expect(named(page, "Gateway")).toContainText("Operational");
    const summary = named(page, "Service summary");
    await expect(summary).toContainText("19Operational");
    await expect(summary).toContainText("3Degraded");
    await expect(summary).toContainText("2Down");
});

test("the title bar and the summary stay put when a tile lands on them", async ({
    page,
}) => {
    await openExample(page, "ops-monitor");
    await settled(page);
    const title = named(page, "Ops monitor");
    const summary = named(page, "Service summary");
    await expect(title).toHaveAttribute("data-static", "");
    await expect(summary).toHaveAttribute("data-static", "");
    const titleBox = await boxOf(title);
    const summaryBox = await boxOf(summary);
    // a tile dropped on the summary, then one on the title bar
    const checkout = named(page, "Checkout");
    let start = await boxOf(checkout);
    await dragBy(page, checkout, 0, summaryBox.y - start.y + 10);
    expect(await boxOf(summary)).toEqual(summaryBox);
    const auth = named(page, "Auth");
    start = await boxOf(auth);
    await dragBy(page, auth, 0, titleBox.y - start.y);
    expect(await boxOf(title)).toEqual(titleBox);
    expect(await boxOf(summary)).toEqual(summaryBox);
    // and a static itself never moves
    await dragBy(page, summary, 200, 200);
    expect(await boxOf(summary)).toEqual(summaryBox);
    await expectNoOverlap(page);
});
