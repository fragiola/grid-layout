import { expect, type Page, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { boxOf, dragTo, expectNoOverlap, named, settled } from "./helpers";

/** The words in reading order on screen: by row, then from the start of the row. */
async function readingOrder(page: Page): Promise<string[]> {
    await settled(page);
    const items = part(page, "item");
    const words = [];
    for (let i = 0; i < (await items.count()); i++) {
        const item = items.nth(i);
        const box = await boxOf(item);
        words.push({
            word: (await item.getAttribute("aria-label")) ?? "",
            y: Math.round(box.y),
            x: box.x,
        });
    }
    return words
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((entry) => entry.word);
}

test("flows the words in reading order, and a drop earlier reorders the flow", async ({
    page,
}) => {
    await openExample(page, "wrap-flow");
    const sentence = await readingOrder(page);
    expect(sentence.slice(0, 4)).toEqual(["Tiles", "flow", "in", "reading"]);
    expect(sentence.at(-1)).toBe("shifts");

    // the last word, dropped on the second one's place
    const flow = await boxOf(named(page, "flow"));
    await dragTo(page, named(page, "shifts"), {
        x: flow.x + flow.width / 2,
        y: flow.y + flow.height / 2,
    });
    const after = await readingOrder(page);
    expect(after).not.toEqual(sentence);
    expect(after.indexOf("shifts")).toBeLessThan(after.indexOf("flow"));
    expect(after.slice(0, 1)).toEqual(["Tiles"]);
    await expectNoOverlap(page);

    // more columns reflow the same order
    const firstRow = async () => {
        const top = (await boxOf(named(page, "Tiles"))).y;
        const order = await readingOrder(page);
        const rows = [];
        for (const word of order) {
            if (Math.abs((await boxOf(named(page, word))).y - top) < 2) {
                rows.push(word);
            }
        }
        return rows;
    };
    const before = (await firstRow()).length;
    await page.getByRole("button", { name: "More columns" }).click();
    await expect(page.getByRole("status", { name: "Columns" })).toHaveText("7");
    expect((await firstRow()).length).toBeGreaterThan(before);
    expect(await readingOrder(page)).toEqual(after);
    await expectNoOverlap(page);
});
