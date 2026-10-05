import { expect, type Page, test } from "@playwright/test";
import { type Box, center } from "./helpers";

// The responsive fixture: the breakpoint follows the grid's container (never the window), each
// breakpoint keeps its own edits, generated layouts have no gaps, and a controlled breakpoint
// wins (Epic #13, R1–R3).

const layouts = async (page: Page): Promise<Record<string, Box[]>> =>
    JSON.parse((await page.getByTestId("layouts").textContent()) ?? "{}");

const breakpoint = (page: Page) =>
    page.getByTestId("grid").getAttribute("data-breakpoint");

/** Every item at the top or resting on another: no gap left by a generation. */
function settled(layout: readonly Box[]): boolean {
    return layout.every(
        (item) =>
            item.y === 0 ||
            layout.some(
                (other) =>
                    other.y + other.h === item.y &&
                    other.x < item.x + item.w &&
                    item.x < other.x + other.w,
            ),
    );
}

test("follows the container's width, telling each change once", async ({
    page,
}) => {
    await page.goto("/fixtures/responsive/");
    expect(await breakpoint(page)).toBe("lg");
    await page.getByTestId("width-900").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "md",
    );
    await page.getByTestId("width-900").click();
    await page.getByTestId("width-600").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "sm",
    );
    await page.getByTestId("width-1100").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "lg",
    );
    await expect(page.getByTestId("switches")).toHaveText("md,sm,lg");
    // the window never changed
    expect(page.viewportSize()?.width).toBe(1280);
});

test("generates a missing layout once, without gaps, and keeps each breakpoint's edits", async ({
    page,
}) => {
    await page.goto("/fixtures/responsive/");
    await page.getByTestId("width-900").click();
    await expect
        .poll(async () => Object.keys(await layouts(page)))
        .toContain("md");
    const md = (await layouts(page)).md ?? [];
    expect(settled(md)).toBe(true);
    expect(md.every((item) => item.x + item.w <= 10)).toBe(true);
    // an edit at md stays at md
    const a = await center(page.getByTestId("item-a"));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 400, a.y + 10, { steps: 10 });
    await page.mouse.up();
    await expect
        .poll(
            async () =>
                (await layouts(page)).md?.find((item) => item.id === "a")?.x,
        )
        .toBeGreaterThan(0);
    const edited = (await layouts(page)).md;
    await page.getByTestId("width-1100").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "lg",
    );
    expect((await layouts(page)).lg?.find((item) => item.id === "a")?.x).toBe(
        0,
    );
    await page.getByTestId("width-900").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "md",
    );
    expect((await layouts(page)).md).toEqual(edited);
    // a narrower one, generated too
    await page.getByTestId("width-400").click();
    await expect
        .poll(async () => Object.keys(await layouts(page)))
        .toContain("xs");
    const xs = (await layouts(page)).xs ?? [];
    expect(settled(xs)).toBe(true);
    expect(xs.every((item) => item.x + item.w <= 4)).toBe(true);
});

test("lets a controlled breakpoint override the width", async ({ page }) => {
    await page.goto("/fixtures/responsive/?breakpoint=xs");
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "xs",
    );
    await page.getByTestId("width-1100").click();
    await expect(page.getByTestId("grid")).toHaveAttribute(
        "data-breakpoint",
        "xs",
    );
});
