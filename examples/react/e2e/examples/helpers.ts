import { expect, type Locator, type Page } from "@playwright/test";

// What the example specs share: an item by its accessible name, a drag by the mouse, and boxes on
// screen to compare.

/** An item (or any element) of the stage by its exact accessible name. */
export function named(page: Page, name: string): Locator {
    return page.getByTestId("stage").getByLabel(name, { exact: true });
}

/** An element's box on screen. */
export async function boxOf(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box, "on screen").not.toBeNull();
    return box ?? { x: 0, y: 0, width: 0, height: 0 };
}

/** Waits until no animation runs on the page: items glide into place after a change. */
export async function settled(page: Page) {
    await page.waitForFunction(() =>
        document
            .getAnimations()
            .every((animation) => animation.playState !== "running"),
    );
}

/** Presses `locator` at its center, moves by `dx`, `dy` pixels, and releases unless told not to. */
export async function dragBy(
    page: Page,
    locator: Locator,
    dx: number,
    dy: number,
    options: { release?: boolean; at?: { x: number; y: number } } = {},
) {
    const box = await boxOf(locator);
    const from = options.at ?? {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
    };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
    if (options.release !== false) {
        await page.mouse.up();
        await settled(page);
    }
}

/** Whether two boxes overlap (touching edges do not). */
export function overlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
): boolean {
    return (
        a.x < b.x + b.width - 1 &&
        b.x < a.x + a.width - 1 &&
        a.y < b.y + b.height - 1 &&
        b.y < a.y + a.height - 1
    );
}

/** Every item's box on the stage, once nothing moves. */
export async function itemBoxes(page: Page) {
    await settled(page);
    const items = page
        .getByTestId("stage")
        .locator('[data-grid-layout-part="item"]');
    const count = await items.count();
    const boxes = [];
    for (let i = 0; i < count; i++) boxes.push(await boxOf(items.nth(i)));
    return boxes;
}

/** Fails when any two items overlap on screen. */
export async function expectNoOverlap(page: Page) {
    const boxes = await itemBoxes(page);
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            expect(
                overlap(boxes[i] as never, boxes[j] as never),
                `items ${i} and ${j}`,
            ).toBe(false);
        }
    }
}

/** Presses `locator` at its center and moves to a viewport point, then releases unless told not to. */
export async function dragTo(
    page: Page,
    locator: Locator,
    to: { x: number; y: number },
    options: { release?: boolean } = {},
) {
    const box = await boxOf(locator);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    if (options.release !== false) {
        await page.mouse.up();
        await settled(page);
    }
}

/** A point inside the grid's root, as fractions of its width and height. */
export async function inRoot(page: Page, fx: number, fy: number) {
    const root = await boxOf(
        page.getByTestId("stage").locator('[data-grid-layout-part="root"]'),
    );
    return { x: root.x + root.width * fx, y: root.y + root.height * fy };
}
