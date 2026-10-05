import { expect, test } from "@playwright/test";
import {
    type Box,
    boxOf,
    cellCentre,
    center,
    changes,
    DIRS,
    dragTo,
    externalFixture,
    layoutOf,
    shapes,
} from "./helpers";

// The external drop fixture, the same spec left-to-right and right-to-left: drag sources in a
// sidebar outside the root (by pointer and by keyboard), a middleware that refuses one and widens
// another, Escape and leaving the grid, a file from the OS, and an item thrown in the trash.

const added = async (page: Parameters<typeof layoutOf>[0]) =>
    (await layoutOf(page)).find((item) => !["a", "b", "c"].includes(item.id));

for (const dir of DIRS) {
    test.describe(dir, () => {
        test("drops a source at the cell under the pointer, pushing others, as previewed", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            await dragTo(
                page,
                await center(page.getByTestId("source-note")),
                await cellCentre(page, dir, 2, 0, 2, 1),
                { release: false },
            );
            await expect(page.getByTestId("grid")).toHaveAttribute(
                "data-dropping",
                "",
            );
            await expect(page.getByTestId("placeholder")).toHaveAttribute(
                "data-kind",
                "drop",
            );
            await expect(page.getByTestId("drag-preview")).toHaveText("note");
            const preview: Box[] = JSON.parse(
                (await page.getByTestId("preview").textContent()) ?? "[]",
            );
            expect(await changes(page)).toBe(0);
            await page.mouse.up();
            await expect(page.getByTestId("drag-preview")).toHaveCount(0);
            expect(await added(page)).toMatchObject({ x: 2, y: 0, w: 2, h: 1 });
            expect(await boxOf(page, "b")).toMatchObject({ x: 2, y: 1 });
            expect(shapes(await layoutOf(page))).toEqual(shapes(preview));
            expect(await changes(page)).toBe(1);
            expect(
                JSON.parse(
                    (await page.getByTestId("drops").textContent()) ?? "",
                ),
            ).toEqual([expect.objectContaining({ data: "note" })]);
        });

        test("the keyboard brings a source in, places it, drops it and focuses it", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            const toEnd = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
            await page.getByTestId("source-note").focus();
            await page.keyboard.press("Enter");
            await expect(page.getByTestId("source-note")).toHaveAttribute(
                "data-grabbed",
                "",
            );
            // the first free cell is (6, 0); one step toward the end
            await page.keyboard.press(toEnd);
            await page.keyboard.press("Shift+ArrowDown");
            expect(await changes(page)).toBe(0);
            await page.keyboard.press("Enter");
            const item = await added(page);
            expect(item).toMatchObject({ x: 7, y: 0, w: 2, h: 2 });
            await expect(page.getByTestId(`item-${item?.id}`)).toBeFocused();
            expect(await changes(page)).toBe(1);
            // Escape leaves the layout as it was
            await page.getByTestId("source-note").focus();
            await page.keyboard.press("Space");
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Escape");
            expect(await changes(page)).toBe(1);
        });

        test("a refused source shows refused and drops nothing", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            await dragTo(
                page,
                await center(page.getByTestId("source-refused")),
                await cellCentre(page, dir, 6, 0, 2, 1),
                { release: false },
            );
            await expect(page.getByTestId("grid")).toHaveAttribute(
                "data-drop-refused",
                "",
            );
            await expect(page.getByTestId("placeholder")).toHaveCount(0);
            await page.mouse.up();
            expect(await changes(page)).toBe(0);
            expect(await layoutOf(page)).toHaveLength(3);
        });

        test("a middleware's new size is shown and dropped", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            await dragTo(
                page,
                await center(page.getByTestId("source-wide")),
                await cellCentre(page, dir, 6, 0, 2, 1),
                { release: false },
            );
            const placeholder = await page
                .getByTestId("placeholder")
                .boundingBox();
            // four columns wide in the preview
            expect(Math.round(placeholder?.width ?? 0)).toBe(
                Math.round((4 * 950) / 12 - 10),
            );
            await page.mouse.up();
            expect(await boxOf(page, "wide")).toMatchObject({ x: 6, w: 4 });
        });

        test("Escape, and leaving the grid, drop nothing", async ({ page }) => {
            await page.goto(externalFixture(dir));
            const source = await center(page.getByTestId("source-note"));
            const over = await cellCentre(page, dir, 6, 0, 2, 1);
            const before = await layoutOf(page);
            await dragTo(page, source, over, { release: false });
            await page.keyboard.press("Escape");
            await expect(page.getByTestId("placeholder")).toHaveCount(0);
            await page.mouse.up();
            await dragTo(page, source, over, { release: false });
            await page.mouse.move(source.x, source.y, { steps: 6 });
            await expect(page.getByTestId("grid")).toHaveAttribute(
                "data-outside",
                "",
            );
            await expect(page.getByTestId("placeholder")).toHaveCount(0);
            await page.mouse.up();
            expect(await layoutOf(page)).toEqual(before);
            expect(await changes(page)).toBe(0);
        });

        test("an item dragged off the grid onto the trash is removed", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            await dragTo(
                page,
                await center(page.getByTestId("item-b")),
                await center(page.getByTestId("trash")),
                { release: false },
            );
            await expect(page.getByTestId("item-b")).toHaveAttribute(
                "data-outside",
                "",
            );
            await page.mouse.up();
            await expect(page.getByTestId("trashed")).toHaveText('["b"]');
            expect(await boxOf(page, "b")).toBeUndefined();
        });

        test("drops a file from the OS (a synthetic DataTransfer)", async ({
            page,
        }) => {
            await page.goto(externalFixture(dir));
            const grid = page.getByTestId("grid");
            const at = await cellCentre(page, dir, 6, 0, 2, 1);
            const files = await page.evaluateHandle(() => {
                const transfer = new DataTransfer();
                transfer.items.add(new File(["plan"], "plan.pdf"));
                return transfer;
            });
            const init = { dataTransfer: files, clientX: at.x, clientY: at.y };
            await grid.dispatchEvent("dragenter", init);
            await grid.dispatchEvent("dragover", init);
            await expect(grid).toHaveAttribute("data-dropping", "");
            await grid.dispatchEvent("drop", init);
            expect(await added(page)).toMatchObject({ x: 6, y: 0, w: 2, h: 1 });
            expect(
                JSON.parse(
                    (await page.getByTestId("drops").textContent()) ?? "",
                ),
            ).toEqual([expect.objectContaining({ data: ["plan.pdf"] })]);
            // any other native drag is refused
            const text = await page.evaluateHandle(() => {
                const transfer = new DataTransfer();
                transfer.setData("text/plain", "hello");
                return transfer;
            });
            await grid.dispatchEvent("dragenter", {
                dataTransfer: text,
                clientX: at.x,
                clientY: at.y,
            });
            await expect(grid).toHaveAttribute("data-drop-refused", "");
        });
    });
}
