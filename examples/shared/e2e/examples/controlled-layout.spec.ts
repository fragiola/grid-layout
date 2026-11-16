import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { boxOf, columnPitch, dragBy, named, settled } from "./helpers";

test("shuffle and reset set the state, and the grid follows", async ({
    page,
}) => {
    await openExample(page, "controlled-layout");
    const state = page.getByTestId("state");
    const start = await state.textContent();
    const boxes = async () =>
        Promise.all(
            [
                "Revenue",
                "Orders",
                "Visitors",
                "Conversion",
                "Latency",
                "Uptime",
            ].map((name) => boxOf(named(page, name))),
        );
    const before = await boxes();
    await page.getByRole("button", { name: "Shuffle" }).click();
    await expect(state).not.toHaveText(start ?? "");
    await settled(page);
    expect(await boxes()).not.toEqual(before);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(state).toHaveText(start ?? "");
    await settled(page);
    expect(await boxes()).toEqual(before);
    // the state changed from outside: the grid tells nothing back
    await expect(page.getByTestId("changes")).toHaveText("0");
});

test("a drag updates the state once", async ({ page }) => {
    await openExample(page, "controlled-layout");
    await dragBy(
        page,
        named(page, "Revenue"),
        (await columnPitch(page)) * 4,
        0,
    );
    await expect(page.getByTestId("changes")).toHaveText("1");
    await expect(page.getByTestId("state")).toContainText(
        '{"id":"revenue","x":4,"y":0,"w":4,"h":2}',
    );
    // nothing more comes after the drop
    await page.waitForTimeout(200);
    await expect(page.getByTestId("changes")).toHaveText("1");
});
