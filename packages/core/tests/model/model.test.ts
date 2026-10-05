import { describe, expect, it } from "vitest";
import { overlaps } from "../../src/layout/collision";
import {
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "../../src/layout/compact";
import { compactLayout } from "../../src/layout/edit";
import type { Layout, LayoutItem } from "../../src/layout/types";
import {
    COMMANDS,
    createGridLayoutModel,
    rulesOf,
    veto,
} from "../../src/model/model";
import type { CommandEvent, GridLayoutModel } from "../../src/model/types";

const item = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra = {},
): LayoutItem => ({
    id,
    x,
    y,
    w,
    h,
    ...extra,
});

const dashboard = (): Layout => [
    item("a", 0, 0, 2, 2),
    item("b", 2, 0, 2, 1),
    item("c", 0, 2, 4, 1),
];

function listen(model: GridLayoutModel): CommandEvent[] {
    const events: CommandEvent[] = [];
    model.subscribe((event) => events.push(event));
    return events;
}

describe("creating a model", () => {
    it("starts from a corrected, settled layout with the defaults", () => {
        const model = createGridLayoutModel({
            layout: [item("a", 0, 5, 2, 2)],
        });
        expect(model.get("layout")).toEqual([item("a", 0, 0, 2, 2)]);
        expect(model.get("rules")).toEqual({
            cols: 12,
            maxRows: Number.POSITIVE_INFINITY,
            compactor: verticalCompactor,
            preventCollision: false,
            allowOverlap: false,
        });
        expect(model.get("breakpoint")).toBe("default");
        expect(Object.isFrozen(model.state)).toBe(true);
    });

    it("throws on an invalid initial layout", () => {
        expect(() =>
            createGridLayoutModel({ layout: [item("a", 0, 0, 0, 1)] }),
        ).toThrow(/invalid layout: w must be an integer/);
    });
});

describe("the commands", () => {
    it("layout.set replaces the layout, corrected and settled", () => {
        const model = createGridLayoutModel({ cols: 4 });
        const result = model.run("layout.set", {
            layout: [item("x", 9, 9, 2, 1)],
        });
        expect(result).toEqual({
            ok: true,
            value: { layout: [item("x", 2, 0, 2, 1)] },
        });
        expect(
            model.run("layout.set", { layout: [item("x", 0, 0, 0, 1)] }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
    });

    it("item.add places an item, at its cell or the first free one", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const free = model.run("item.add", { item: { id: "n", w: 2, h: 1 } });
        expect(free).toMatchObject({
            ok: true,
            value: { item: { id: "n", x: 2, y: 1, w: 2, h: 1 } },
        });
        const placed = model.run("item.add", {
            item: { id: "m", x: 0, y: 0, w: 1, h: 1 },
        });
        expect(placed).toMatchObject({
            ok: true,
            value: { item: { x: 0, y: 0 } },
        });
        expect(model.get("item-by", { itemId: "a" })?.y).toBe(1);
    });

    it("item.add refuses a used id and a bad item, and keeps the size within the limits", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        expect(
            model.run("item.add", { item: { id: "a", w: 1, h: 1 } }),
        ).toMatchObject({
            ok: false,
            error: {
                code: "invalid_payload",
                message: 'id "a" is already used',
            },
        });
        expect(
            model.run("item.add", { item: { id: "z", w: 0, h: 1 } }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
        const limited = model.run("item.add", {
            item: { id: "l", w: 9, h: 1, maxW: 3 },
        });
        expect(limited).toMatchObject({ ok: true, value: { item: { w: 3 } } });
    });

    it("item.remove removes, then settles; an unknown id is not_found", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        expect(model.run("item.remove", { itemId: "a" })).toEqual({
            ok: true,
            value: { itemId: "a" },
        });
        expect(model.get("item-by", { itemId: "c" })?.y).toBe(1);
        expect(model.run("item.remove", { itemId: "a" })).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
    });

    it("item.move moves and pushes; a static is refused; outside the grid is invalid", () => {
        const model = createGridLayoutModel({
            cols: 4,
            layout: [...dashboard(), item("s", 0, 3, 1, 1, { static: true })],
        });
        expect(
            model.run("item.move", { itemId: "b", x: 0, y: 0 }),
        ).toMatchObject({
            ok: true,
            value: { item: { id: "b", x: 0, y: 0 } },
        });
        expect(model.get("item-by", { itemId: "a" })?.y).toBe(1);
        expect(
            model.run("item.move", { itemId: "s", x: 2, y: 0 }),
        ).toMatchObject({
            ok: false,
            error: { code: "refused" },
        });
        expect(
            model.run("item.move", { itemId: "b", x: 3, y: 0 }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
        expect(
            model.run("item.move", { itemId: "b", x: 0.5, y: 0 }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
        expect(
            model.run("item.move", { itemId: "nope", x: 0, y: 0 }),
        ).toMatchObject({
            ok: false,
            error: { code: "not_found" },
        });
    });

    it("item.move and item.resize report a collision under preventCollision", () => {
        const model = createGridLayoutModel({
            cols: 4,
            compactor: noCompactor,
            preventCollision: true,
            layout: dashboard(),
        });
        expect(
            model.run("item.move", { itemId: "b", x: 1, y: 0 }),
        ).toMatchObject({
            ok: false,
            error: { code: "collision" },
        });
        expect(
            model.run("item.resize", { itemId: "b", w: 2, h: 3 }),
        ).toMatchObject({
            ok: false,
            error: { code: "collision" },
        });
        expect(
            model.run("item.move", { itemId: "b", x: 2, y: 1 }),
        ).toMatchObject({ ok: true });
    });

    it("item.resize resizes from a side, anchored, within the limits", () => {
        const model = createGridLayoutModel({
            cols: 4,
            layout: [item("a", 2, 0, 2, 2, { minW: 1, maxH: 3 })],
        });
        expect(
            model.run("item.resize", {
                itemId: "a",
                w: 4,
                h: 2,
                side: "start",
            }),
        ).toMatchObject({
            ok: true,
            value: { item: item("a", 0, 0, 4, 2, { minW: 1, maxH: 3 }) },
        });
        expect(
            model.run("item.resize", { itemId: "a", w: 4, h: 9 }),
        ).toMatchObject({
            ok: true,
            value: { item: { h: 3 } },
        });
        expect(
            model.run("item.resize", {
                itemId: "a",
                w: 1,
                h: 1,
                side: "left" as never,
            }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("item.configure changes limits and flags, bringing the size back within them", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        expect(
            model.run("item.configure", { itemId: "a", settings: { maxW: 1 } }),
        ).toMatchObject({
            ok: true,
            value: { item: { w: 1, maxW: 1 } },
        });
        model.run("item.configure", {
            itemId: "b",
            settings: { draggable: false },
        });
        expect(model.is("item-draggable-by", { itemId: "b" })).toBe(false);
        expect(model.is("item-resizable-by", { itemId: "b" })).toBe(true);
        model.run("item.configure", {
            itemId: "b",
            settings: { static: true },
        });
        expect(model.is("item-static-by", { itemId: "b" })).toBe(true);
        expect(model.is("item-resizable-by", { itemId: "b" })).toBe(false);
        expect(
            model.run("item.configure", { itemId: "b", settings: { minW: 0 } }),
        ).toMatchObject({ ok: false, error: { code: "invalid_payload" } });
    });

    it("grid.configure changes the rules and settles every layout under them", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const result = model.run("grid.configure", {
            settings: { cols: 2, compactor: horizontalCompactor },
        });
        expect(result).toMatchObject({
            ok: true,
            value: { rules: { cols: 2 } },
        });
        expect(model.state.compactor).toBe(horizontalCompactor);
        for (const entry of model.get("layout")) {
            expect(entry.x + entry.w).toBeLessThanOrEqual(2);
        }
        expect(overlaps(model.get("layout"))).toBe(false);
        expect(
            model.run("grid.configure", { settings: { cols: 0 } }),
        ).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
    });

    it("refuses an unknown command and a payload of the wrong shape, without throwing", () => {
        const model = createGridLayoutModel();
        expect(
            (model.run as (command: string, payload: unknown) => unknown)(
                "nope",
                {},
            ),
        ).toMatchObject({
            ok: false,
            error: { code: "unknown_command" },
        });
        expect(model.run("item.add", null as never)).toMatchObject({
            ok: false,
            error: { code: "invalid_payload" },
        });
        expect(model.run("layout.set", { layout: "x" as never })).toMatchObject(
            {
                ok: false,
                error: { code: "invalid_payload" },
            },
        );
    });
});

describe("the review's cases", () => {
    it("item.add turns y: Infinity into the row below everything", () => {
        for (const extra of [{ static: true }, {}]) {
            const model = createGridLayoutModel({
                cols: 4,
                layout: dashboard(),
                allowOverlap: !("static" in extra),
            });
            const result = model.run("item.add", {
                item: {
                    id: "n",
                    x: 0,
                    y: Number.POSITIVE_INFINITY,
                    w: 1,
                    h: 1,
                    ...extra,
                },
            });
            expect(result).toMatchObject({
                ok: true,
                value: { item: { y: 3 } },
            });
        }
    });

    it("item.configure never moves or resizes an item", () => {
        const model = createGridLayoutModel({
            cols: 8,
            layout: [item("s", 0, 0, 2, 2, { static: true })],
        });
        const settings = { x: 6, y: 3, w: 1, maxH: 5 } as never;
        expect(
            model.run("item.configure", { itemId: "s", settings }),
        ).toMatchObject({
            ok: true,
            value: { item: { x: 0, y: 0, w: 2, maxH: 5 } },
        });
    });

    it("item.configure that changes nothing commits nothing", () => {
        const model = createGridLayoutModel({
            cols: 4,
            layout: [item("a", 0, 0, 2, 2, { maxW: 3 })],
        });
        const events = listen(model);
        const state = model.state;
        model.run("item.configure", { itemId: "a", settings: { maxW: 3 } });
        expect(model.state).toBe(state);
        expect(events).toEqual([]);
    });

    it("a listener that throws keeps the change and the other listeners", async () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const unhandled: unknown[] = [];
        const onError = (error: unknown) => unhandled.push(error);
        process.on("uncaughtException", onError);
        try {
            model.subscribe(() => {
                throw new Error("a listener's bug");
            });
            const events = listen(model);
            const result = model.run("item.remove", { itemId: "a" });
            expect(result).toMatchObject({ ok: true });
            expect(events).toHaveLength(1);
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(unhandled).toEqual([new Error("a listener's bug")]);
        } finally {
            process.off("uncaughtException", onError);
        }
    });

    it("refuses invalid options as grid.configure refuses the same settings", () => {
        expect(() => createGridLayoutModel({ cols: 0 })).toThrow(
            /cols must be an integer/,
        );
        expect(() => createGridLayoutModel({ maxRows: 1.5 })).toThrow(
            /maxRows/,
        );
        expect(() => createGridLayoutModel({ compactor: {} as never })).toThrow(
            /compactor/,
        );
    });
});

describe("the epic review's cases", () => {
    it("item.add moves a static off a static already there", () => {
        const model = createGridLayoutModel({
            cols: 8,
            layout: [item("s", 0, 0, 4, 2, { static: true })],
        });
        model.run("item.add", {
            item: { id: "t", x: 2, y: 0, w: 4, h: 2, static: true },
        });
        expect(overlaps(model.get("layout"))).toBe(false);
        expect(model.get("item-by", { itemId: "t" })).toMatchObject({
            x: 2,
            y: 2,
        });
    });

    it("grid.configure keeps the layouts when no layout changed", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const events = listen(model);
        model.run("grid.configure", { settings: { preventCollision: true } });
        expect(events).toHaveLength(1);
        expect(events[0]?.after.layouts).toBe(events[0]?.before.layouts);
    });

    it("item commands return the settled layout with the item", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const result = model.check("item.move", { itemId: "b", x: 0, y: 0 });
        expect(
            result.ok &&
                result.value.layout.find((entry) => entry.id === "a")?.y,
        ).toBe(1);
        expect(model.get("item-by", { itemId: "a" })?.y).toBe(0);
    });
});

describe("events", () => {
    it("tells each committed change once, with the state before and after", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const events = listen(model);
        const before = model.state;
        model.run("item.move", { itemId: "b", x: 0, y: 0 });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            command: "item.move",
            payload: { itemId: "b", x: 0, y: 0 },
            before,
            after: model.state,
        });
    });

    it("tells nothing for a change that changes nothing", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const events = listen(model);
        const state = model.state;
        expect(
            model.run("item.move", { itemId: "a", x: 0, y: 0 }),
        ).toMatchObject({ ok: true });
        // vertical compaction brings it straight back up
        expect(
            model.run("item.move", { itemId: "b", x: 2, y: 1 }),
        ).toMatchObject({ ok: true });
        model.run("layout.set", { layout: model.get("layout") });
        model.run("grid.configure", { settings: { cols: 4 } });
        expect(events).toEqual([]);
        expect(model.state).toBe(state);
    });

    it("queues a command a listener issues, so listeners see events in order", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const seen: string[] = [];
        model.subscribe((event) => {
            seen.push(event.command);
            if (event.command === "item.remove") {
                expect(
                    model.run("item.add", { item: { id: "back", w: 1, h: 1 } }),
                ).toMatchObject({ ok: false, error: { code: "queued" } });
            }
        });
        model.run("item.remove", { itemId: "a" });
        expect(seen).toEqual(["item.remove", "item.add"]);
        expect(model.get("item-by", { itemId: "back" })).toBeDefined();
    });
});

describe("middleware", () => {
    it("vetoes a command: nothing changes and nothing is told", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const events = listen(model);
        model.use((ctx, next) =>
            ctx.command === "item.move" ? veto("locked") : next(),
        );
        expect(model.run("item.move", { itemId: "b", x: 0, y: 0 })).toEqual({
            ok: false,
            error: { code: "vetoed", message: "locked" },
        });
        expect(model.can("item.move", { itemId: "b", x: 0, y: 0 })).toBe(false);
        expect(events).toEqual([]);
    });

    it("rewrites a payload before the command runs", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const events = listen(model);
        model.use((ctx, next) => {
            if (ctx.command === "item.move")
                ctx.payload = { ...ctx.payload, x: 2 };
            return next();
        });
        expect(
            model.run("item.move", { itemId: "a", x: 0, y: 3 }),
        ).toMatchObject({
            ok: true,
            value: { item: { x: 2 } },
        });
        expect(events[0]?.payload).toMatchObject({ x: 2 });
    });

    it("observes results, sees dry runs, is removable, and a throw becomes an error", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        const dryRuns: boolean[] = [];
        const remove = model.use((ctx, next) => {
            dryRuns.push(ctx.dryRun);
            return next();
        });
        expect(
            model.check("item.move", { itemId: "b", x: 0, y: 0 }),
        ).toMatchObject({ ok: true });
        expect(model.get("item-by", { itemId: "b" })?.x).toBe(2);
        model.run("item.move", { itemId: "b", x: 0, y: 0 });
        expect(dryRuns).toEqual([true, false]);
        remove();
        model.run("item.move", { itemId: "b", x: 2, y: 0 });
        expect(dryRuns).toHaveLength(2);
        model.use(() => {
            throw new Error("boom");
        });
        expect(model.run("item.remove", { itemId: "a" })).toEqual({
            ok: false,
            error: { code: "middleware_error", message: "boom" },
        });
    });

    it("vetoes when a middleware neither calls next nor answers", () => {
        const model = createGridLayoutModel({ cols: 4, layout: dashboard() });
        model.use(() => undefined);
        expect(model.run("item.remove", { itemId: "a" })).toMatchObject({
            ok: false,
            error: { code: "vetoed" },
        });
    });
});

describe("queries", () => {
    it("read the layout, an item, the bottom and an item's collisions", () => {
        const model = createGridLayoutModel({
            cols: 4,
            layout: dashboard(),
            allowOverlap: true,
        });
        expect(model.get("bottom")).toBe(3);
        expect(model.get("collisions-by", { itemId: "a" })).toEqual([]);
        model.run("item.move", { itemId: "b", x: 1, y: 0 });
        expect(
            model
                .get("collisions-by", { itemId: "b" })
                .map((entry) => entry.id),
        ).toEqual(["a"]);
        expect(model.get("collisions-by", { itemId: "nope" })).toEqual([]);
        expect(model.get("layouts")).toEqual({ default: model.get("layout") });
        expect(model.is("item-draggable-by", { itemId: "nope" })).toBe(false);
    });
});

describe("the invariant", () => {
    // a deterministic stream of random commands: whatever runs, the layout stays valid
    function random(seed: number) {
        let value = seed;
        return (max: number) => {
            value = (value * 16807) % 2147483647;
            return Math.floor((value / 2147483647) * max);
        };
    }

    for (const [name, compactor] of [
        ["vertical", verticalCompactor],
        ["horizontal", horizontalCompactor],
        ["none", noCompactor],
    ] as const) {
        it(`holds over 600 random commands with ${name} compaction`, () => {
            const next = random(name.length * 7919);
            const model = createGridLayoutModel({
                cols: 6,
                compactor,
                layout: [item("s", 2, 2, 2, 1, { static: true })],
            });
            for (let i = 0; i < 600; i++) {
                const ids = model.get("layout").map((entry) => entry.id);
                const id = ids[next(ids.length)] ?? "s";
                switch (next(5)) {
                    case 0:
                        model.run("item.add", {
                            item: {
                                id: `n${i}`,
                                w: 1 + next(3),
                                h: 1 + next(3),
                            },
                        });
                        break;
                    case 1:
                        model.run("item.move", {
                            itemId: id,
                            x: next(6),
                            y: next(8),
                        });
                        break;
                    case 2:
                        model.run("item.resize", {
                            itemId: id,
                            w: 1 + next(6),
                            h: 1 + next(4),
                            side: (
                                [
                                    "end",
                                    "start",
                                    "top",
                                    "bottom",
                                    "bottom-end",
                                ] as const
                            )[next(5)],
                        });
                        break;
                    case 3:
                        if (ids.length > 6 && id !== "s") {
                            model.run("item.remove", { itemId: id });
                        }
                        break;
                    default:
                        model.run("item.add", {
                            item: {
                                id: `p${i}`,
                                x: next(5),
                                y: next(6),
                                w: 1 + next(2),
                                h: 1,
                            },
                        });
                }
                const layout = model.get("layout");
                expect(overlaps(layout), `after command ${i}`).toBe(false);
                for (const entry of layout) {
                    expect(entry.x).toBeGreaterThanOrEqual(0);
                    expect(entry.x + entry.w).toBeLessThanOrEqual(6);
                    expect(entry.y).toBeGreaterThanOrEqual(0);
                }
                expect(model.get("item-by", { itemId: "s" })).toMatchObject({
                    x: 2,
                    y: 2,
                });
                // settled: compacting again changes nothing
                expect(compactLayout(layout, rulesOf(model.state))).toBe(
                    layout,
                );
            }
        });
    }
});

describe("the command list", () => {
    it("names every command, each with a dot (Dockable rule 13)", () => {
        expect(new Set(COMMANDS).size).toBe(COMMANDS.length);
        for (const command of COMMANDS) {
            expect(command).toMatch(/^[a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*$/);
        }
    });
});
