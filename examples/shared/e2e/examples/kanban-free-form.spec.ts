import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import {
    boxOf,
    columnPitch,
    dragBy,
    dragTo,
    expectNoOverlap,
    inRoot,
    named,
    settled,
} from "./helpers";

/** A point on a note's header strip: its title, which is not a control. */
async function header(page: Parameters<typeof named>[0], name: string) {
    const box = await boxOf(named(page, name));
    return { x: box.x + 16, y: box.y + 14 };
}

test("a note comes in from the source, moves where it is free, and is refused onto another", async ({
    page,
}) => {
    await openExample(page, "kanban-free-form");
    const items = part(page, "item");
    await expect(items).toHaveCount(8);
    // in from the source, low in the Done lane
    await dragTo(page, named(page, "New note"), await inRoot(page, 0.8, 0.75));
    await expect(items).toHaveCount(9);
    const note = named(page, "Note 6");
    await expect(note).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
        "New note added at column",
    );
    await expect(named(page, "Done")).toContainText("2");
    // moved by its header into the Doing lane
    const pitch = await columnPitch(page, 12, 8);
    const start = await boxOf(note);
    await dragBy(page, note, -pitch * 4, 0, {
        at: await header(page, "Note 6"),
    });
    const moved = await boxOf(note);
    expect(moved.x).toBeLessThan(start.x - pitch * 3);
    expect(moved.y).toBeCloseTo(start.y, 0);
    await expect(named(page, "Doing")).toContainText("2");
    // Note 3 sits right under Note 1: every place on the way overlaps it, so the move is refused
    const three = named(page, "Note 3");
    const below = await boxOf(three);
    const one = await boxOf(named(page, "Note 1"));
    await dragBy(page, three, 0, one.y - below.y, {
        at: await header(page, "Note 3"),
    });
    expect(await boxOf(three)).toEqual(below);
    await expectNoOverlap(page);
});

test("typing in a note works, and never moves it", async ({ page }) => {
    await openExample(page, "kanban-free-form");
    await settled(page);
    const note = named(page, "Note 1");
    const before = await boxOf(note);
    const text = named(page, "Text of Note 1");
    await dragBy(page, text, 120, 80);
    await text.fill("");
    await text.pressSequentially("Ship it on Friday");
    await expect(text).toHaveValue("Ship it on Friday");
    await settled(page);
    expect(await boxOf(note)).toEqual(before);
    // its colour changes from a button inside it, which does not drag either
    await named(page, "Change the colour of Note 1").click();
    expect(await boxOf(note)).toEqual(before);
});
