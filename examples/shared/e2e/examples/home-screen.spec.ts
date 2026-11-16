import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragAlong, middle, named } from "./helpers";

test("a held icon moves to another cell, the others making room", async ({
    page,
}) => {
    await openExample(page, "home-screen");
    const phone = named(page, "Phone");
    const camera = await middle(named(page, "Camera"));
    const start = await boxOf(phone);
    await dragAlong(page, await middle(phone), camera, { hold: 450 });
    await expect
        .poll(async () => (await boxOf(phone)).x)
        .toBeGreaterThan(start.x + 100);
    await expect(part(page, "root")).not.toHaveAttribute("data-dragging", "");
});
