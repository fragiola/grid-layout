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

/** The external drop fixture's page for a direction. */
export function externalFixture(dir: Dir): string {
    return `/fixtures/external/${dir === "rtl" ? "?dir=rtl" : ""}`;
}

/** The viewport point at the centre of a box of the grid, in cells: where a drop puts it there. */
export async function cellCentre(
    page: Page,
    dir: Dir,
    x: number,
    y: number,
    w: number,
    h: number,
): Promise<{ x: number; y: number }> {
    const root = await page.getByTestId("grid").boundingBox();
    expect(root).not.toBeNull();
    const inline = 10 + STEP_X * x + (w * STEP_X - 10) / 2;
    return {
        x:
            dir === "rtl"
                ? (root?.x ?? 0) + (root?.width ?? 0) - inline
                : (root?.x ?? 0) + inline,
        y: (root?.y ?? 0) + 10 + STEP_Y * y + (h * STEP_Y - 10) / 2,
    };
}

/** Presses at `from` with the mouse and moves to `to` in steps, then releases unless told not to. */
export async function dragTo(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
    options: { release?: boolean } = {},
): Promise<void> {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    if (options.release !== false) await page.mouse.up();
}

/** A layout's boxes by position, ids aside (a drop's preview holds a stand-in id). */
export function shapes(layout: readonly Box[]) {
    return layout
        .map(({ x, y, w, h }) => ({ x, y, w, h }))
        .sort((p, q) => p.y - q.y || p.x - q.x);
}

/**
 * A finger on the screen along `points`: down at the first, held `hold` milliseconds, then moved
 * through the others and lifted. Chromium's real touch input (the DevTools protocol, which also
 * scrolls the page); elsewhere, touch pointer events dispatched on the page (no native scroll).
 */
export async function touchPath(
    page: Page,
    points: readonly { x: number; y: number }[],
    options: { hold?: number; steps?: number } = {},
): Promise<void> {
    const { hold = 0, steps = 8 } = options;
    const [first, ...rest] = points;
    if (!first) return;
    const path: { x: number; y: number }[] = [];
    let from = first;
    for (const to of rest) {
        for (let step = 1; step <= steps; step++) {
            path.push({
                x: from.x + ((to.x - from.x) * step) / steps,
                y: from.y + ((to.y - from.y) * step) / steps,
            });
        }
        from = to;
    }
    if (page.context().browser()?.browserType().name() === "chromium") {
        const client = await page.context().newCDPSession(page);
        await client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [first],
        });
        if (hold > 0) await page.waitForTimeout(hold);
        for (const point of path) {
            await client.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [point],
            });
        }
        await client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        await client.detach();
        return;
    }
    await page.evaluate(
        async ({ first, path, hold }) => {
            const target = document.elementFromPoint(first.x, first.y);
            const fire = (
                type: string,
                at: { x: number; y: number },
                on: EventTarget,
            ) =>
                on.dispatchEvent(
                    new PointerEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        pointerId: 7,
                        pointerType: "touch",
                        isPrimary: true,
                        clientX: at.x,
                        clientY: at.y,
                        buttons: type === "pointerup" ? 0 : 1,
                    }),
                );
            if (!target) return;
            fire("pointerdown", first, target);
            await new Promise((done) => setTimeout(done, hold));
            for (const at of path) {
                fire("pointermove", at, document);
                await new Promise((done) => requestAnimationFrame(done));
            }
            fire("pointerup", path.at(-1) ?? first, document);
        },
        { first, path, hold },
    );
}
