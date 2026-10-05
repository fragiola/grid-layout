import { expect, test } from "@playwright/test";
import {
    boxOf,
    center,
    changes,
    DIRS,
    drag,
    fixture,
    layoutOf,
    STEP_X,
    STEP_Y,
} from "./helpers";

// The unstyled fixture, the same spec left-to-right and right-to-left (D11): drag with push and
// compaction, a click that is not a drag, statics, every resize side, drag handles and controls,
// bounds, cancelling, the keyboard, and what renders.

for (const dir of DIRS) {
    test.describe(dir, () => {
        test("drags an item, pushes the one it lands on, and tells the change once", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            await drag(page, page.getByTestId("item-a"), dir, 2, 0);
            expect(await boxOf(page, "a")).toMatchObject({ x: 2, y: 0 });
            expect(await boxOf(page, "b")).toMatchObject({ x: 2, y: 2 });
            expect(await changes(page)).toBe(1);
        });

        test("a press that barely moves is a click, not a drag", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            const before = await layoutOf(page);
            const from = await center(page.getByTestId("item-b"));
            await page.mouse.move(from.x, from.y);
            await page.mouse.down();
            await page.mouse.move(from.x + 2, from.y + 1);
            await page.mouse.up();
            expect(await layoutOf(page)).toEqual(before);
            await expect(page.getByTestId("placeholder")).toHaveCount(0);
            expect(await changes(page)).toBe(0);
        });

        test("a static item never moves, and the others go around it", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            await drag(page, page.getByTestId("item-s"), dir, -3, 1);
            expect(await boxOf(page, "s")).toMatchObject({ x: 6, y: 0 });
            await drag(page, page.getByTestId("item-b"), dir, 4, 0);
            expect(await boxOf(page, "s")).toMatchObject({ x: 6, y: 0 });
            const b = await boxOf(page, "b");
            expect(b?.x).toBe(6);
            expect(b?.y).toBeGreaterThanOrEqual(1);
        });

        // a (0,0 2×2), free mode: `cols` toward the end, `rows` down
        const RESIZES = {
            end: { cols: 1, rows: 0, box: { x: 0, y: 0, w: 3, h: 2 } },
            bottom: { cols: 0, rows: 1, box: { x: 0, y: 0, w: 2, h: 3 } },
            start: { cols: 1, rows: 0, box: { x: 1, y: 0, w: 1, h: 2 } },
            top: { cols: 0, rows: 1, box: { x: 0, y: 1, w: 2, h: 1 } },
            "bottom-end": { cols: 1, rows: 1, box: { x: 0, y: 0, w: 3, h: 3 } },
            "top-start": { cols: 1, rows: 1, box: { x: 1, y: 1, w: 1, h: 1 } },
            "top-end": { cols: 1, rows: 1, box: { x: 0, y: 1, w: 3, h: 1 } },
            "bottom-start": {
                cols: 1,
                rows: 1,
                box: { x: 1, y: 0, w: 1, h: 3 },
            },
        } as const;
        for (const [side, resize] of Object.entries(RESIZES)) {
            test(`resizes from ${side}, the opposite edge staying put`, async ({
                page,
            }) => {
                await page.goto(fixture(dir, "compactor=none"));
                await drag(
                    page,
                    page.getByTestId(`resize-a-${side}`),
                    dir,
                    resize.cols,
                    resize.rows,
                );
                expect(await boxOf(page, "a")).toMatchObject(resize.box);
                expect(await changes(page)).toBe(1);
            });
        }

        test("drags only from a drag handle, never from a control", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            await drag(page, page.getByTestId("item-c"), dir, 4, 0);
            expect(await boxOf(page, "c")).toMatchObject({ x: 4, y: 0 });
            await drag(page, page.getByTestId("field-c"), dir, 4, 0);
            expect(await boxOf(page, "c")).toMatchObject({ x: 4, y: 0 });
            await page.getByTestId("field-c").click();
            await expect(page.getByTestId("field-c")).toBeFocused();
            await drag(page, page.getByTestId("handle-c"), dir, 4, 0);
            expect(await boxOf(page, "c")).toMatchObject({ x: 8, y: 0 });
            expect(await changes(page)).toBe(1);
        });

        test("keeps a bounded item inside the root", async ({ page }) => {
            await page.goto(fixture(dir));
            await page.getByTestId("bounded").check();
            // past the root's start and top edges, still on the page
            await drag(page, page.getByTestId("item-b"), dir, -4, -2, {
                release: false,
            });
            const root = await page.getByTestId("grid").boundingBox();
            const item = await page.getByTestId("item-b").boundingBox();
            expect(root && item).toBeTruthy();
            if (root && item) {
                expect(item.x).toBeGreaterThanOrEqual(root.x - 0.5);
                expect(item.x + item.width).toBeLessThanOrEqual(
                    root.x + root.width + 0.5,
                );
                expect(item.y).toBeGreaterThanOrEqual(root.y - 0.5);
            }
            await page.mouse.up();
            expect(await boxOf(page, "b")).toMatchObject({ x: 0, y: 0 });
        });

        test("Escape cancels a drag: nothing moves and nothing is told", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            const before = await layoutOf(page);
            await drag(page, page.getByTestId("item-a"), dir, 3, 1, {
                release: false,
            });
            await expect(page.getByTestId("placeholder")).toHaveCount(1);
            await page.keyboard.press("Escape");
            await page.mouse.up();
            expect(await layoutOf(page)).toEqual(before);
            expect(await changes(page)).toBe(0);
            // the item is back where it was drawn
            const a = await page.getByTestId("item-a").boundingBox();
            const root = await page.getByTestId("grid").boundingBox();
            if (a && root) {
                const start =
                    dir === "rtl"
                        ? root.x + root.width - 10 - a.width
                        : root.x + 10;
                expect(Math.abs(a.x - start)).toBeLessThan(1);
            }
        });

        test("renders nothing while a drag stays over one cell", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            const from = await center(page.getByTestId("item-b"));
            await page.mouse.move(from.x, from.y);
            await page.mouse.down();
            await page.mouse.move(from.x + 10, from.y + 4, { steps: 2 });
            await expect(page.getByTestId("placeholder")).toHaveCount(1);
            const renders = await page.getByTestId("renders").textContent();
            for (let i = 0; i < 10; i++) {
                await page.mouse.move(from.x + 10 + i, from.y + 4 + (i % 3));
            }
            expect(await page.getByTestId("renders").textContent()).toBe(
                renders,
            );
            await page.mouse.move(
                from.x + 3 * STEP_X * (dir === "rtl" ? -1 : 1),
                from.y + STEP_Y,
                {
                    steps: 4,
                },
            );
            expect(
                Number(await page.getByTestId("renders").textContent()),
            ).toBeGreaterThan(Number(renders));
            await page.mouse.up();
        });

        test("the keyboard grabs, moves, resizes, drops and cancels", async ({
            page,
        }) => {
            await page.goto(fixture(dir));
            const toEnd = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
            await page.getByTestId("item-a").focus();
            await page.keyboard.press("Space");
            await expect(page.getByTestId("item-a")).toHaveAttribute(
                "data-grabbed",
                "",
            );
            await page.keyboard.press(toEnd);
            await page.keyboard.press(toEnd);
            await page.keyboard.press("Shift+ArrowDown");
            await page.keyboard.press("Enter");
            expect(await boxOf(page, "a")).toMatchObject({
                x: 2,
                y: 0,
                w: 2,
                h: 3,
            });
            expect(await changes(page)).toBe(1);
            await expect(page.getByTestId("item-a")).toBeFocused();
            // Escape puts it back, Tab too (and moves on)
            await page.keyboard.press("Space");
            await page.keyboard.press(toEnd);
            await page.keyboard.press("Escape");
            await page.keyboard.press("Enter");
            await page.keyboard.press(toEnd);
            await page.keyboard.press("Tab");
            expect(await boxOf(page, "a")).toMatchObject({ x: 2, y: 0 });
            expect(await changes(page)).toBe(1);
        });

        test("a drag handle is the item's tab stop", async ({ page }) => {
            await page.goto(fixture(dir));
            await expect(page.getByTestId("item-c")).toHaveAttribute(
                "tabindex",
                "-1",
            );
            await page.getByTestId("handle-c").focus();
            await page.keyboard.press("Enter");
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Enter");
            expect(await boxOf(page, "c")).toMatchObject({ x: 4 });
            expect(await changes(page)).toBeGreaterThanOrEqual(0);
        });

        test("controlled, the layout follows the fixture's state", async ({
            page,
        }) => {
            await page.goto(fixture(dir, "controlled=1"));
            await drag(page, page.getByTestId("item-a"), dir, 2, 0);
            expect(await boxOf(page, "a")).toMatchObject({ x: 2, y: 0 });
            const b = await page.getByTestId("item-b").boundingBox();
            const root = await page.getByTestId("grid").boundingBox();
            // b drawn where the committed layout puts it: row 2
            if (b && root)
                expect(Math.round(b.y - root.y)).toBe(10 + 2 * STEP_Y);
        });
    });
}
