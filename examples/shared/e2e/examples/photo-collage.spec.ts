import { expect, type Page, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragTo, expectNoOverlap, named, settled } from "./helpers";

/** The photos in reading order on screen: by row, then from the start of the row. */
async function readingOrder(page: Page): Promise<string[]> {
    await settled(page);
    const items = part(page, "item");
    const photos = [];
    for (let i = 0; i < (await items.count()); i++) {
        const item = items.nth(i);
        const box = await boxOf(item);
        photos.push({
            name: (await item.getAttribute("aria-label")) ?? "",
            y: Math.round(box.y),
            x: box.x,
        });
    }
    return photos
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((entry) => entry.name);
}

test("photos flow in order, and one dropped earlier reorders the flow", async ({
    page,
}) => {
    await openExample(page, "photo-collage");
    const album = await readingOrder(page);
    expect(album[0]).toBe("Harbour at dawn");
    await expectNoOverlap(page);

    // the last photo, dropped on the first one's place
    const first = await boxOf(named(page, "Harbour at dawn"));
    const last = album.at(-1) ?? "";
    await dragTo(page, named(page, last), {
        x: first.x + 12,
        y: first.y + 12,
    });
    const after = await readingOrder(page);
    expect(after).not.toEqual(album);
    expect(after.indexOf(last)).toBeLessThan(album.indexOf(last));
    expect(after.indexOf(last)).toBeLessThan(after.indexOf("Dunes"));
    await expectNoOverlap(page);

    // a new order flows the same way, without overlap
    await page.getByRole("button", { name: "Shuffle" }).click();
    expect(await readingOrder(page)).not.toEqual(after);
    await expectNoOverlap(page);
});
