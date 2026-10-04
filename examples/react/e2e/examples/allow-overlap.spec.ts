import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, dragBy, named, overlap } from "./helpers";

test("a note dropped on another stays on it", async ({ page }) => {
    await openExample(page, "allow-overlap");
    const call = named(page, "Call the supplier");
    const book = await boxOf(named(page, "Book the venue"));
    const start = await boxOf(call);
    await dragBy(page, call, book.x - start.x + 20, book.y - start.y + 20);
    expect(
        overlap(await boxOf(call), await boxOf(named(page, "Book the venue"))),
    ).toBe(true);
});
