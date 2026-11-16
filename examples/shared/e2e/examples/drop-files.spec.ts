import { expect, test } from "@playwright/test";
import { openExample, part } from "../helpers";
import { expectNoOverlap, inRoot, named } from "./helpers";

test("drops files from the computer where they land, and refuses anything else", async ({
    page,
}) => {
    await openExample(page, "drop-files");
    const root = part(page, "root");
    const items = part(page, "item");
    await expect(items).toHaveCount(0);
    const at = await inRoot(page, 0.5, 0.3);
    // a drag from the operating system, as Chromium builds one (a synthetic DataTransfer)
    const files = await page.evaluateHandle(() => {
        const transfer = new DataTransfer();
        transfer.items.add(
            new File(["hello"], "plan.pdf", { type: "application/pdf" }),
        );
        transfer.items.add(
            new File(["png"], "photo.png", { type: "image/png" }),
        );
        return transfer;
    });
    const init = { dataTransfer: files, clientX: at.x, clientY: at.y };
    await root.dispatchEvent("dragenter", init);
    await root.dispatchEvent("dragover", init);
    await expect(root).toHaveAttribute("data-dropping", "");
    await root.dispatchEvent("drop", init);
    await expect(items).toHaveCount(2);
    await expect(named(page, "plan.pdf")).toContainText("5 B");
    await expect(named(page, "photo.png")).toContainText("Image");
    await expectNoOverlap(page);
    const text = await page.evaluateHandle(() => {
        const transfer = new DataTransfer();
        transfer.setData("text/plain", "hello");
        return transfer;
    });
    await root.dispatchEvent("dragenter", {
        dataTransfer: text,
        clientX: at.x,
        clientY: at.y,
    });
    await expect(root).toHaveAttribute("data-drop-refused", "");
});

test("adds files chosen without a pointer", async ({ page }) => {
    await openExample(page, "drop-files");
    await page
        .getByTestId("stage")
        .locator('input[type="file"]')
        .setInputFiles([
            {
                name: "notes.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("hi"),
            },
        ]);
    await expect(part(page, "item")).toHaveCount(1);
    await expect(named(page, "notes.txt")).toContainText("Text");
});
