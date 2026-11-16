import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { named } from "./helpers";

test("moves an item from the form, through model.run", async ({ page }) => {
    await openExample(page, "remote-control");
    const form = page.getByRole("form", { name: "Remote control" });
    await form.getByLabel("Item").selectOption("revenue");
    await form.getByLabel("x", { exact: true }).fill("8");
    await form.getByLabel("y", { exact: true }).fill("3");
    await form.getByRole("button", { name: "Move", exact: true }).click();
    await expect(named(page, "Revenue")).toContainText("x 8 · y 3");
    // the form shows the item as it landed
    await expect(form.getByLabel("x", { exact: true })).toHaveValue("8");
    await form.getByLabel("w", { exact: true }).fill("2");
    await form.getByRole("button", { name: "Resize" }).click();
    await expect(named(page, "Revenue")).toContainText("2 × 2");
});

test("disables what the model would refuse, and says why", async ({ page }) => {
    await openExample(page, "remote-control");
    const form = page.getByRole("form", { name: "Remote control" });
    const move = form.getByRole("button", { name: "Move", exact: true });
    const status = form.getByRole("status");
    await expect(move).toBeEnabled();
    // a cell past the last column
    await form.getByLabel("x", { exact: true }).fill("20");
    await expect(move).toBeDisabled();
    await expect(status).toContainText("outside the grid");
    // a static item neither moves nor resizes; it can still be removed
    await form.getByLabel("Item").selectOption("banner");
    await expect(move).toBeDisabled();
    await expect(form.getByRole("button", { name: "Resize" })).toBeDisabled();
    await expect(status).toContainText("static");
    const remove = form.getByRole("button", { name: "Remove" });
    await expect(remove).toBeEnabled();
    await remove.click();
    await expect(named(page, "Banner (static)")).toHaveCount(0);
});
