import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { columnPitch, dragBy, named } from "./helpers";

test("a drag logs its gesture events and the command it commits", async ({
    page,
}) => {
    await openExample(page, "event-log");
    const lines = page
        .getByRole("log", { name: "Events" })
        .getByRole("listitem");
    await dragBy(
        page,
        named(page, "Revenue"),
        (await columnPitch(page)) * 4,
        0,
    );
    // newest first: the gesture's end, its one command, its start
    await expect(lines.nth(0)).toContainText("drag-stop");
    await expect(lines.nth(1)).toContainText("item.move");
    await expect(lines.nth(1)).toContainText("Revenue at x 4, y 0");
    await expect(lines.nth(2)).toContainText("drag-start");
    await expect(lines).toHaveCount(3);
});

test("the filters choose what is logged", async ({ page }) => {
    await openExample(page, "event-log");
    const log = page.getByRole("log", { name: "Events" });
    await page.getByRole("switch", { name: "Gestures" }).click();
    await page.getByRole("switch", { name: "Commands" }).click();
    await page.getByRole("switch", { name: "Every step" }).click();
    await dragBy(page, named(page, "Orders"), 0, 120);
    await expect(log.getByRole("listitem").first()).toContainText("drag");
    await expect(log).not.toContainText("item.move");
    await expect(log).not.toContainText("drag-start");
    await page.getByRole("button", { name: "Clear the log" }).click();
    await expect(log.getByRole("listitem")).toHaveCount(1);
    await expect(log).toContainText("Drag or resize a widget");
});
