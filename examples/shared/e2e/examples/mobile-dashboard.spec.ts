import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragAlong, middle, named, onPhone } from "./helpers";

test("a held card moves to another place in the column", async ({ page }) => {
    await openExample(page, "mobile-dashboard");
    const revenue = named(page, "Revenue");
    const orders = await boxOf(named(page, "Orders"));
    const from = await middle(revenue);
    await dragAlong(
        page,
        from,
        // past more than half of the next card: compaction would lift it back otherwise
        { x: from.x, y: orders.y + orders.height * 1.6 },
        { hold: 450 },
    );
    await expect
        .poll(async () => (await boxOf(revenue)).y)
        .toBeGreaterThan(orders.y - 1);
});

test("a swipe on a card scrolls the phone, and moves nothing", async ({
    page,
}) => {
    test.skip(!onPhone(), "a swipe is a finger's");
    await openExample(page, "mobile-dashboard");
    const phone = page.getByTestId("phone");
    const root = phone.locator('[data-grid-layout-part="root"]');
    /** Each card's top in the grid: the order, whatever the scroll. */
    const order = () =>
        root.evaluate((grid) =>
            [...grid.querySelectorAll<HTMLElement>("[data-item-id]")].map(
                (item) =>
                    `${item.dataset.itemId}:${Math.round(
                        item.getBoundingClientRect().top -
                            grid.getBoundingClientRect().top,
                    )}`,
            ),
        );
    const before = await order();
    const from = await middle(named(page, "Orders"));
    await dragAlong(page, from, { x: from.x, y: from.y - 250 });
    await expect
        .poll(() => phone.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(40);
    expect(await order()).toEqual(before);
});
