import { describe, expect, it } from "vitest";
import type { Layout, LayoutItem } from "../../src/layout/types";
import { createGridLayoutModel, veto } from "../../src/model/model";
import type { CommandEvent, GridLayoutModel } from "../../src/model/types";

// The model's breakpoints (R1–R3): columns and layouts per breakpoint, switching, generation as
// a command of its own, and every item command at a breakpoint.

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
): LayoutItem => ({ id, x, y, w, h });

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768 };
const COLS = { lg: 12, md: 10, sm: 6 };

function responsive(layouts: Record<string, Layout> = {}) {
    return createGridLayoutModel({
        breakpoints: BREAKPOINTS,
        cols: COLS,
        layouts: {
            lg: [item("a", 0, 0, 4, 2), item("b", 4, 0, 8, 2)],
            ...layouts,
        },
    });
}

function told(model: GridLayoutModel): CommandEvent[] {
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    return events;
}

describe("a responsive model", () => {
    it("starts at the widest breakpoint with its columns, a grid without breakpoints as before", () => {
        const model = responsive();
        expect(model.get("breakpoint")).toBe("lg");
        expect(model.get("cols")).toBe(12);
        expect(model.get("cols-by", { breakpoint: "sm" })).toBe(6);
        expect(model.get("breakpoints")).toEqual(BREAKPOINTS);
        const plain = createGridLayoutModel({
            layout: [item("a", 0, 0, 2, 1)],
        });
        expect(plain.get("breakpoint")).toBe("default");
        expect(plain.get("breakpoints")).toEqual({ default: 0 });
        expect(plain.get("cols")).toBe(12);
    });

    it("gives the breakpoint for a width", () => {
        const model = responsive();
        expect(model.get("breakpoint-for", { width: 1000 })).toBe("md");
        expect(model.get("breakpoint-for", { width: 996 })).toBe("md");
        expect(model.get("breakpoint-for", { width: 10 })).toBe("sm");
    });

    it("refuses options that do not hold together", () => {
        expect(() =>
            createGridLayoutModel({
                breakpoints: BREAKPOINTS,
                cols: { lg: 12 },
            }),
        ).toThrow(/cols for breakpoint "md"/);
        expect(() =>
            createGridLayoutModel({
                breakpoints: BREAKPOINTS,
                cols: { ...COLS, xl: 16 },
            }),
        ).toThrow(/cols names no breakpoint "xl"/);
        expect(() =>
            createGridLayoutModel({
                breakpoints: BREAKPOINTS,
                cols: COLS,
                breakpoint: "xl",
            }),
        ).toThrow(/no breakpoint "xl"/);
        expect(() =>
            createGridLayoutModel({
                breakpoints: BREAKPOINTS,
                layouts: { xl: [] },
            }),
        ).toThrow(/layouts names no breakpoint "xl"/);
        expect(() => createGridLayoutModel({ breakpoints: {} })).toThrow(
            /at least one breakpoint/,
        );
    });

    it("generates the starting breakpoint's layout when only others are given", () => {
        const model = createGridLayoutModel({
            breakpoints: BREAKPOINTS,
            cols: COLS,
            breakpoint: "sm",
            layouts: { lg: [item("a", 0, 0, 12, 1)] },
        });
        expect(model.get("layout")).toEqual([item("a", 0, 0, 6, 1)]);
    });
});

describe("switching breakpoints", () => {
    it("generates a missing layout as a command of its own, once", () => {
        const model = responsive();
        const events = told(model);
        expect(model.run("breakpoint.set", { breakpoint: "sm" })).toMatchObject(
            {
                ok: true,
                value: { breakpoint: "sm", cols: 6 },
            },
        );
        expect(events.map((event) => event.command)).toEqual([
            "breakpoint.set",
            "layouts.generate",
        ]);
        expect(model.get("cols")).toBe(6);
        expect(model.get("layout")).toEqual([
            item("a", 0, 0, 4, 2),
            item("b", 0, 2, 6, 2),
        ]);
        // a second activation reuses it
        model.run("breakpoint.set", { breakpoint: "lg" });
        model.run("breakpoint.set", { breakpoint: "sm" });
        expect(events.map((event) => event.command)).toEqual([
            "breakpoint.set",
            "layouts.generate",
            "breakpoint.set",
            "breakpoint.set",
        ]);
    });

    it("keeps each breakpoint's edits", () => {
        const model = responsive();
        model.run("breakpoint.set", { breakpoint: "sm" });
        model.run("item.move", { itemId: "a", x: 2, y: 0 });
        const sm = model.get("layout");
        model.run("breakpoint.set", { breakpoint: "lg" });
        expect(model.get("item-by", { itemId: "a" })).toMatchObject({ x: 0 });
        model.run("breakpoint.set", { breakpoint: "sm" });
        expect(model.get("layout")).toBe(sm);
    });

    it("shows an item added on one breakpoint on another at its next activation", () => {
        const model = responsive();
        model.run("breakpoint.set", { breakpoint: "sm" });
        model.run("breakpoint.set", { breakpoint: "lg" });
        model.run("item.add", { item: item("c", 0, 0, 3, 1) });
        model.run("item.remove", { itemId: "b" });
        const events = told(model);
        model.run("breakpoint.set", { breakpoint: "sm" });
        // brought up to date in the same change: one event
        expect(events.map((event) => event.command)).toEqual([
            "breakpoint.set",
        ]);
        expect(
            model
                .get("layout")
                .map((entry) => entry.id)
                .sort(),
        ).toEqual(["a", "c"]);
    });

    it("lets middleware see, and refuse, a generation", () => {
        const model = responsive();
        const seen: string[] = [];
        model.use((ctx, next) => {
            seen.push(ctx.command);
            return ctx.command === "layouts.generate" ? veto() : next();
        });
        model.run("breakpoint.set", { breakpoint: "md" });
        expect(seen).toEqual(["breakpoint.set", "layouts.generate"]);
        expect(model.get("layout-by", { breakpoint: "md" })).toBeUndefined();
        expect(model.get("layout")).toEqual([]);
    });

    it("refuses a breakpoint it does not have", () => {
        const model = responsive();
        expect(model.run("breakpoint.set", { breakpoint: "xl" })).toMatchObject(
            {
                ok: false,
                error: { code: "invalid_payload" },
            },
        );
    });
});

describe("commands at a breakpoint", () => {
    it("edits the breakpoint an item command names", () => {
        const model = responsive({
            md: [item("a", 0, 0, 4, 2), item("b", 4, 0, 6, 2)],
        });
        const result = model.run("item.move", {
            itemId: "a",
            x: 6,
            y: 0,
            breakpoint: "md",
        });
        expect(result.ok).toBe(true);
        expect(model.get("layout-by", { breakpoint: "md" })?.[0]).toMatchObject(
            {
                id: "a",
            },
        );
        expect(model.get("item-by", { itemId: "a" })).toMatchObject({ x: 0 });
        // within that breakpoint's columns
        expect(
            model.run("item.move", {
                itemId: "a",
                x: 8,
                y: 0,
                breakpoint: "md",
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("adds and removes on a breakpoint and the active one alike: their next activation keeps it", () => {
        const model = responsive({
            sm: [item("a", 0, 0, 4, 2), item("b", 0, 2, 6, 2)],
        });
        model.run("item.add", {
            item: item("c", 0, 0, 2, 1),
            breakpoint: "sm",
        });
        model.run("item.remove", { itemId: "b", breakpoint: "sm" });
        expect(
            model
                .get("layout")
                .map((entry) => entry.id)
                .sort(),
        ).toEqual(["a", "c"]);
        model.run("breakpoint.set", { breakpoint: "sm" });
        expect(
            model
                .get("layout")
                .map((entry) => entry.id)
                .sort(),
        ).toEqual(["a", "c"]);
    });

    it("refuses a breakpoint without a layout, or one it does not have", () => {
        const model = responsive();
        expect(
            model.run("item.remove", { itemId: "a", breakpoint: "sm" }),
        ).toMatchObject({ ok: false, error: { code: "not_found" } });
        expect(
            model.run("item.remove", { itemId: "a", breakpoint: "xl" }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("replaces every layout, and generates the active one when it is left out", () => {
        const model = responsive();
        const events = told(model);
        model.run("layouts.set", {
            layouts: { sm: [item("z", 0, 0, 12, 1)] },
        });
        expect(model.get("layout-by", { breakpoint: "sm" })).toEqual([
            item("z", 0, 0, 6, 1),
        ]);
        expect(events.map((event) => event.command)).toEqual([
            "layouts.set",
            "layouts.generate",
        ]);
        expect(model.get("layout").map((entry) => entry.id)).toEqual(["z"]);
        expect(model.run("layouts.set", { layouts: { xl: [] } })).toMatchObject(
            { ok: false, error: { code: "invalid_payload" } },
        );
    });

    it("configures columns and breakpoints, each layout settling in its own columns", () => {
        const model = responsive({ sm: [item("a", 0, 0, 6, 1)] });
        const events = told(model);
        model.run("grid.configure", {
            settings: { breakpoints: BREAKPOINTS, cols: { ...COLS } },
        });
        expect(events).toHaveLength(0);
        model.run("grid.configure", {
            settings: { cols: { lg: 12, md: 10, sm: 4 } },
        });
        expect(model.get("layout-by", { breakpoint: "sm" })).toEqual([
            item("a", 0, 0, 4, 1),
        ]);
        expect(model.get("cols")).toBe(12);
        // the active breakpoint gone: the widest new one, from its layout
        const moved = createGridLayoutModel({
            breakpoints: BREAKPOINTS,
            cols: COLS,
            layouts: { lg: [item("a", 0, 0, 12, 1)] },
        });
        expect(
            moved.run("grid.configure", {
                settings: { breakpoints: { wide: 0 }, cols: 8 },
            }).ok,
        ).toBe(true);
        expect(moved.get("breakpoint")).toBe("wide");
        expect(moved.get("layout")).toEqual([item("a", 0, 0, 8, 1)]);
        model.run("grid.configure", {
            settings: {
                breakpoints: { lg: 900, sm: 0 },
                cols: { lg: 12, sm: 4 },
            },
        });
        expect(Object.keys(model.get("layouts")).sort()).toEqual(["lg", "sm"]);
        // one number: every breakpoint
        model.run("grid.configure", { settings: { cols: 8 } });
        expect(model.get("cols-by", { breakpoint: "sm" })).toBe(8);
    });
});
