// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createGridLayoutEngine } from "../../src/engine/engine";
import type { LayoutItem } from "../../src/layout/types";
import { createGridLayoutModel } from "../../src/model/model";
import type { CommandEvent } from "../../src/model/types";
import { pointer, setup } from "./harness";

// The engine's breakpoint (R1, R4): the grid's own width picks it, a controlled one overrides it,
// geometry follows it, and a width wavering at a threshold settles.

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
): LayoutItem => ({ id, x, y, w, h });

const responsive = (extra = {}) => ({
    breakpoints: { lg: 996, sm: 0 },
    cols: { lg: 12, sm: 6 },
    layouts: { lg: [item("a", 0, 0, 4, 2), item("b", 4, 0, 4, 2)] },
    ...extra,
});

function switches(model: ReturnType<typeof setup>["model"]): string[] {
    const seen: string[] = [];
    model.subscribe((event: CommandEvent) => {
        if (event.command === "breakpoint.set")
            seen.push(event.after.breakpoint);
    });
    return seen;
}

describe("the breakpoint", () => {
    it("follows the grid's width, once per change, keeping each breakpoint's edits", () => {
        const grid = setup(responsive());
        const seen = switches(grid.model);
        expect(grid.view().breakpoint).toBe("lg");
        grid.resizeTo(800);
        expect(grid.view().breakpoint).toBe("sm");
        expect(grid.view().geometry?.cols).toBe(6);
        grid.model.run("item.move", { itemId: "a", x: 2, y: 0 });
        grid.resizeTo(820);
        grid.resizeTo(1200);
        expect(grid.view().breakpoint).toBe("lg");
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 0,
        });
        grid.resizeTo(700);
        expect(grid.model.get("item-by", { itemId: "a" })).toMatchObject({
            x: 2,
        });
        expect(seen).toEqual(["sm", "lg", "sm"]);
    });

    it("starts at the breakpoint the width gives", () => {
        const grid = setup({ ...responsive(), width: 600 });
        expect(grid.model.get("breakpoint")).toBe("sm");
        expect(grid.view().geometry?.cols).toBe(6);
    });

    it("settles a width wavering at a threshold: no resize loop", () => {
        const grid = setup(responsive());
        const seen = switches(grid.model);
        // a breakpoint's taller layout brings a scrollbar, which takes the width back and forth
        grid.resizeTo(990);
        grid.resizeTo(1004);
        grid.resizeTo(990);
        grid.resizeTo(1004);
        expect(seen).toEqual(["sm"]);
        // well past it, it crosses back
        grid.resizeTo(1100);
        expect(seen).toEqual(["sm", "lg"]);
    });

    it("lets a controlled breakpoint override the width, the width deciding again once released", () => {
        const grid = setup(responsive());
        grid.engine.adapter.setOptions({
            rowHeight: 50,
            gap: [10, 10],
            breakpoint: "sm",
        });
        expect(grid.model.get("breakpoint")).toBe("sm");
        grid.resizeTo(1300);
        expect(grid.model.get("breakpoint")).toBe("sm");
        grid.engine.adapter.setOptions({ rowHeight: 50, gap: [10, 10] });
        expect(grid.model.get("breakpoint")).toBe("lg");
    });

    it("keeps an app's own breakpoint until the width gives a new one", () => {
        const grid = setup(responsive());
        grid.model.run("breakpoint.set", { breakpoint: "sm" });
        grid.resizeTo(1240);
        expect(grid.model.get("breakpoint")).toBe("sm");
        grid.resizeTo(700);
        grid.resizeTo(1240);
        expect(grid.model.get("breakpoint")).toBe("lg");
    });

    it("applies a given width and a controlled breakpoint from the start, before any root", () => {
        const fixed = createGridLayoutEngine(
            createGridLayoutModel(responsive()),
            {
                width: 600,
            },
        );
        expect(fixed.adapter.getView().breakpoint).toBe("sm");
        const controlled = createGridLayoutEngine(
            createGridLayoutModel(responsive()),
            { breakpoint: "sm" },
        );
        expect(controlled.adapter.getView().breakpoint).toBe("sm");
        fixed.destroy();
        controlled.destroy();
    });

    it("decides again when the thresholds change", () => {
        const grid = setup({ ...responsive(), width: 900 });
        expect(grid.model.get("breakpoint")).toBe("sm");
        grid.model.run("grid.configure", {
            settings: { breakpoints: { lg: 800, sm: 0 } },
        });
        expect(grid.model.get("breakpoint")).toBe("lg");
    });

    it("never waits on a given width", () => {
        const grid = setup({ ...responsive(), engine: { width: 1200 } });
        grid.engine.adapter.setOptions({ width: 990 });
        grid.engine.adapter.setOptions({ width: 1004 });
        expect(grid.model.get("breakpoint")).toBe("lg");
    });

    it("places items with the breakpoint's own row height, gap and padding (R4)", () => {
        const grid = setup({
            ...responsive(),
            engine: {
                rowHeight: { lg: 50, sm: 30 },
                gap: { lg: [10, 10], sm: [4, 4] },
                padding: { sm: [0, 0] },
            },
        });
        expect(grid.view().geometry).toMatchObject({
            rowHeight: 50,
            gap: [10, 10],
            padding: [10, 10],
        });
        grid.resizeTo(800);
        expect(grid.view().geometry).toMatchObject({
            rowHeight: 30,
            gap: [4, 4],
            padding: [0, 0],
        });
    });

    it("waits for a gesture to end before it changes the breakpoint", () => {
        const grid = setup(responsive());
        const press = pointer(grid.item("a"), 20, 20);
        press.move(300, 20);
        // a scrollbar the drag's preview brought: the gesture goes on, at lg
        grid.resizeTo(800);
        expect(grid.view().gesture).toBeDefined();
        expect(grid.model.get("breakpoint")).toBe("lg");
        press.release(300, 20);
        expect(grid.events.at(-1)?.type).toBe("drag-stop");
        expect(grid.model.get("breakpoint")).toBe("sm");
    });

    it("never switches a grid without breakpoints", () => {
        const grid = setup({ layout: [item("a", 0, 0, 2, 1)] });
        const seen = switches(grid.model);
        grid.resizeTo(300);
        grid.resizeTo(2000);
        expect(seen).toEqual([]);
        expect(grid.view().breakpoint).toBe("default");
    });
});
