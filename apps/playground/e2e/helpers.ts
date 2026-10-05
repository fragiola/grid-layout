import { expect, type Locator, type Page } from "@playwright/test";

// The fixture's geometry (src/fixture/grid-fixture.tsx): 12 columns on a 960px root with a 10px
// gap and padding (a column every 79.17px), rows of 40px (a row every 50px).

export const STEP_X = 950 / 12;
export const STEP_Y = 50;

export const DIRS = ["ltr", "rtl"] as const;
export type Dir = (typeof DIRS)[number];

/** The fixture's page for a direction, with its query. */
export function fixture(dir: Dir, query = ""): string {
    return `/fixtures/${dir === "rtl" ? "rtl" : "basic"}/${query ? `?${query}` : ""}`;
}

export interface Box {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** The committed layout, as the fixture shows it. */
export async function layoutOf(page: Page): Promise<Box[]> {
    return JSON.parse((await page.getByTestId("layout").textContent()) ?? "[]");
}

/** One item of the committed layout. */
export async function boxOf(page: Page, id: string): Promise<Box | undefined> {
    return (await layoutOf(page)).find((entry) => entry.id === id);
}

/** How many layout changes the fixture was told of. */
export async function changes(page: Page): Promise<number> {
    return Number(await page.getByTestId("changes").textContent());
}

/** The center of an element on screen. */
export async function center(
    locator: Locator,
): Promise<{ x: number; y: number }> {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return {
        x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    };
}

/**
 * Presses `locator` with the mouse and moves it by `cols` columns toward the inline end (toward the
 * start when negative) and `rows` rows down, then releases unless told not to.
 */
export async function drag(
    page: Page,
    locator: Locator,
    dir: Dir,
    cols: number,
    rows: number,
    options: { release?: boolean } = {},
): Promise<void> {
    const from = await center(locator);
    const sign = dir === "rtl" ? -1 : 1;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(
        from.x + sign * cols * STEP_X,
        from.y + rows * STEP_Y,
        { steps: 8 },
    );
    if (options.release !== false) await page.mouse.up();
}
