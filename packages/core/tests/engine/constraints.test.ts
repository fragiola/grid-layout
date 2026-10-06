// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { DropItem } from "../../src/engine/types";
import { overlaps } from "../../src/layout/collision";
import { noCompactor } from "../../src/layout/compact";
import {
    aspectRatio,
    boundedX,
    boundedY,
    type ConstraintEnv,
    containerBounds,
    gridBounds,
    maxSize,
    minMaxSize,
    minSize,
    snapToGrid,
} from "../../src/layout/constraints";
import { compactLayout } from "../../src/layout/edit";
import { itemPixels } from "../../src/layout/geometry";
import type { Layout, LayoutItem, ResizeSide } from "../../src/layout/types";
import { type HarnessOptions, key, pointer, setup } from "./harness";

// Each built-in constraint (K1) through every input: a pointer, the keyboard, a drop from a drag
// source (by pointer and by keyboard) and a plain `model.run`. Then a property test that the
// preview a gesture shows is what it commits, compaction settling with a position constraint in
// one pass, and frozen layouts left as given.
//
// The grid is 1944px wide: 12 columns of 144px a 16px gap apart (a column every 160px), rows of
// 81px a 9px gap apart (a row every 90px), and a 20px padding. Its cells are 16:9 exactly, so an
// `aspectRatio(16 / 9)` item keeps its ratio in pixels, padding included.

const WIDTH = 1944;
const COL = 160;
const ROW = 90;
const PAD = 20;
const ENGINE = {
    rowHeight: 81,
    gap: [16, 9] as const,
    padding: [PAD, PAD] as const,
};
/** the root's height with `autoSize: false` and `containerBounds`: four rows show */
const SHOWN = 4 * ROW - 9 + 2 * PAD;
const RATIO = 16 / 9;

interface GridOptions extends HarnessOptions {
    /** the root's own height (with `autoSize: false`); a tall root otherwise */
    shown?: number;
}

type Grid = ReturnType<typeof grid>;

/** A grid on the harness, its root's box on screen tall enough for every drop and move. */
function grid(options: GridOptions) {
    const { shown, engine, ...rest } = options;
    const made = setup({
        width: WIDTH,
        ...rest,
        engine: { ...ENGINE, ...engine },
    });
    const height = shown ?? 4000;
    made.root.getBoundingClientRect = () => new DOMRect(0, 0, WIDTH, height);
    if (shown !== undefined) {
        Object.defineProperty(made.root, "clientHeight", { get: () => shown });
    }
    return made;
}

/** A layout frozen deep: the model must never mutate what it is given (D6). */
function frozen(layout: readonly LayoutItem[]): Layout {
    return Object.freeze(layout.map((entry) => Object.freeze({ ...entry })));
}

const box = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    extra: Partial<LayoutItem> = {},
): LayoutItem => ({ id, x, y, w, h, ...extra });

/** The viewport point inside cell (x, y), 5px from its corner. */
const at = (x: number, y: number) =>
    [PAD + COL * x + 5, PAD + ROW * y + 5] as const;

/** The viewport point at the centre of a box: where a pointer drops an item there. */
function centre(g: Grid, x: number, y: number, w: number, h: number) {
    const geometry = g.view().geometry;
    if (!geometry) throw new Error("not measured");
    const px = itemPixels(geometry, { x, y, w, h });
    return [px.left + px.width / 2, px.top + px.height / 2] as const;
}

/** Keys pressed on `target`; `+Arrow…` holds Shift. */
function press(target: Element, keys: readonly string[]): void {
    for (const name of keys) {
        const shift = name.startsWith("+");
        key(target, shift ? name.slice(1) : name, { shiftKey: shift });
    }
}

const times = (n: number, name: string): string[] =>
    Array.from({ length: n }, () => name);

/** The pixels an engine gives a command: its geometry, and the height it shows. */
function envOf(g: Grid, shown: number | undefined): ConstraintEnv {
    return { geometry: g.view().geometry, height: shown ?? g.view().height };
}

function itemOf(g: Grid, id: string): LayoutItem {
    const found = g.model.get("item-by", { itemId: id });
    if (!found) throw new Error(`no item "${id}"`);
    return found;
}

/** A layout's boxes by id: what a preview and a commit must agree on. */
const boxes = (layout: Layout) =>
    layout
        .map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))
        .sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));

// ─── one test per input kind per constraint ──────────────────────────────────────────────────

type Kind =
    | "pointer"
    | "keyboard"
    | "drop by pointer"
    | "drop by keyboard"
    | "model.run";

interface Case {
    readonly name: string;
    readonly options: GridOptions;
    /** a pointer move of `a` to a cell, or a resize of it from a side by whole cells */
    readonly pointer:
        | { readonly to: readonly [number, number] }
        | { readonly side: ResizeSide; readonly by: readonly [number, number] };
    /** the keys between grabbing `a` and dropping it */
    readonly keys: readonly string[];
    /** a drop from a drag source: its item, the cell its pointer centres it on, its keys */
    readonly drop: {
        readonly item: DropItem;
        readonly at: readonly [number, number];
        readonly keys: readonly string[];
    };
    /** the command a plain `model.run` asks for */
    readonly run: (
        g: Grid,
        env: ConstraintEnv | undefined,
    ) => { readonly ok: boolean };
    /** it reads the engine's pixels: `model.run` gets them as `env` */
    readonly pixels?: boolean;
    /** what the constraint guarantees of the item changed, whatever the input */
    readonly holds: (item: LayoutItem, g: Grid) => void;
    /** where each input lands, exactly */
    readonly want: Readonly<Record<Kind, Partial<LayoutItem>>>;
}

/** the item each case changes, and one out of the way */
const pair = (a: LayoutItem = box("a", 0, 0, 2, 2)) =>
    frozen([a, box("b", 9, 0, 3, 3)]);

const MAX_ROWS = 4;

const CASES: readonly Case[] = [
    {
        name: "gridBounds",
        options: {
            layout: pair(),
            maxRows: MAX_ROWS,
            constraints: [gridBounds, minMaxSize],
        },
        pointer: { side: "bottom", by: [0, 5] },
        keys: times(5, "+ArrowDown"),
        drop: { item: { w: 2, h: 8 }, at: [4, 0], keys: ["+ArrowDown"] },
        run: (g, env) =>
            g.model.run("item.resize", { itemId: "a", w: 2, h: 9 }, { env }),
        holds: (item) => expect(item.y + item.h).toBeLessThanOrEqual(MAX_ROWS),
        want: {
            pointer: { y: 0, w: 2, h: 4 },
            keyboard: { y: 0, w: 2, h: 4 },
            "drop by pointer": { x: 4, y: 0, w: 2, h: 4 },
            "drop by keyboard": { y: 0, w: 2, h: 4 },
            "model.run": { y: 0, w: 2, h: 4 },
        },
    },
    {
        name: "minMaxSize",
        options: {
            layout: pair(
                box("a", 0, 0, 2, 2, { minW: 2, maxW: 4, minH: 1, maxH: 3 }),
            ),
        },
        pointer: { side: "bottom-end", by: [5, 5] },
        keys: [...times(4, "+ArrowRight"), ...times(4, "+ArrowDown")],
        drop: {
            item: { w: 8, h: 6, minW: 2, maxW: 4, minH: 1, maxH: 3 },
            at: [2, 0],
            keys: ["+ArrowRight", "+ArrowDown"],
        },
        run: (g, env) =>
            g.model.run("item.resize", { itemId: "a", w: 9, h: 9 }, { env }),
        holds: (item) => {
            expect(item.w).toBeGreaterThanOrEqual(item.minW ?? 1);
            expect(item.w).toBeLessThanOrEqual(item.maxW ?? Number.NaN);
            expect(item.h).toBeGreaterThanOrEqual(item.minH ?? 1);
            expect(item.h).toBeLessThanOrEqual(item.maxH ?? Number.NaN);
        },
        want: {
            pointer: { w: 4, h: 3 },
            keyboard: { w: 4, h: 3 },
            "drop by pointer": { w: 4, h: 3 },
            "drop by keyboard": { w: 4, h: 3 },
            "model.run": { w: 4, h: 3 },
        },
    },
    {
        name: "containerBounds",
        options: {
            layout: pair(),
            compactor: noCompactor,
            constraints: [containerBounds, minMaxSize],
            engine: { autoSize: false },
            shown: SHOWN,
        },
        pointer: { to: [1, 3] },
        keys: times(5, "ArrowDown"),
        drop: { item: { w: 2, h: 2 }, at: [4, 3], keys: times(5, "ArrowDown") },
        run: (g, env) =>
            g.model.run("item.move", { itemId: "a", x: 0, y: 6 }, { env }),
        pixels: true,
        holds: (item, g) => {
            const geometry = g.view().geometry;
            if (!geometry) throw new Error("not measured");
            const px = itemPixels(geometry, item);
            // inside the rows the root shows, its padding included
            expect(px.top + px.height).toBeLessThanOrEqual(SHOWN - PAD);
            expect(item.y + item.h).toBeLessThanOrEqual(4);
        },
        want: {
            pointer: { x: 1, y: 2 },
            keyboard: { x: 0, y: 2 },
            "drop by pointer": { x: 4, y: 2 },
            "drop by keyboard": { x: 2, y: 2 },
            "model.run": { x: 0, y: 2 },
        },
    },
    {
        name: "boundedX",
        options: {
            layout: pair(),
            compactor: noCompactor,
            maxRows: MAX_ROWS,
            constraints: [boundedX, minMaxSize],
        },
        pointer: { to: [1, 6] },
        keys: times(6, "ArrowDown"),
        drop: { item: { w: 2, h: 2 }, at: [4, 6], keys: times(6, "ArrowDown") },
        run: (g, env) =>
            g.model.run("item.move", { itemId: "a", x: 0, y: 6 }, { env }),
        holds: (item) => {
            // past maxRows (only the columns bound it), and inside the columns
            expect(item.y + item.h).toBeGreaterThan(MAX_ROWS);
            expect(item.x).toBeGreaterThanOrEqual(0);
            expect(item.x + item.w).toBeLessThanOrEqual(12);
        },
        want: {
            pointer: { x: 1, y: 6 },
            keyboard: { x: 0, y: 6 },
            "drop by pointer": { x: 4, y: 6 },
            "drop by keyboard": { x: 2, y: 6 },
            "model.run": { x: 0, y: 6 },
        },
    },
    {
        name: "boundedY",
        options: {
            layout: pair(),
            compactor: noCompactor,
            maxRows: MAX_ROWS,
            constraints: [boundedY, minMaxSize],
        },
        pointer: { to: [1, 6] },
        keys: times(6, "ArrowDown"),
        drop: { item: { w: 2, h: 2 }, at: [4, 6], keys: times(6, "ArrowDown") },
        run: (g, env) =>
            g.model.run("item.move", { itemId: "a", x: 0, y: 6 }, { env }),
        holds: (item) => {
            expect(item.y + item.h).toBeLessThanOrEqual(MAX_ROWS);
            expect(item.x + item.w).toBeLessThanOrEqual(12);
        },
        want: {
            pointer: { x: 1, y: 2 },
            keyboard: { x: 0, y: 2 },
            "drop by pointer": { x: 4, y: 2 },
            "drop by keyboard": { x: 2, y: 2 },
            "model.run": { x: 0, y: 2 },
        },
    },
    {
        name: "snapToGrid(3)",
        options: {
            layout: pair(),
            compactor: noCompactor,
            constraints: [gridBounds, minMaxSize, snapToGrid(3)],
        },
        pointer: { to: [4, 4] },
        // one arrow is one snap step, not a step the snap takes back
        keys: ["ArrowRight", "ArrowDown"],
        drop: { item: { w: 2, h: 2 }, at: [7, 1], keys: ["ArrowRight"] },
        run: (g, env) =>
            g.model.run("item.move", { itemId: "a", x: 5, y: 2 }, { env }),
        holds: (item) => {
            expect(item.x % 3).toBe(0);
            expect(item.y % 3).toBe(0);
        },
        want: {
            pointer: { x: 3, y: 3 },
            keyboard: { x: 3, y: 3 },
            "drop by pointer": { x: 6, y: 0 },
            // the first free cell is (2, 0), snapped to (3, 0); one ArrowRight: (6, 0)
            "drop by keyboard": { x: 6, y: 0 },
            "model.run": { x: 6, y: 3 },
        },
    },
    {
        name: "aspectRatio(16 / 9)",
        options: {
            layout: pair(),
            constraints: [gridBounds, minMaxSize, aspectRatio(RATIO)],
        },
        pointer: { side: "end", by: [2, 0] },
        keys: times(2, "+ArrowRight"),
        drop: { item: { w: 4, h: 1 }, at: [2, 0], keys: ["+ArrowRight"] },
        run: (g, env) =>
            g.model.run("item.resize", { itemId: "a", w: 6, h: 1 }, { env }),
        pixels: true,
        holds: (item, g) => {
            const geometry = g.view().geometry;
            if (!geometry) throw new Error("not measured");
            const px = itemPixels(geometry, item);
            expect(Math.abs(px.width / RATIO - px.height)).toBeLessThanOrEqual(
                1,
            );
        },
        want: {
            pointer: { w: 4, h: 4 },
            keyboard: { w: 4, h: 4 },
            "drop by pointer": { w: 4, h: 4 },
            // a 4 × 1 enters as 4 × 4; one Shift+ArrowRight: 5 × 5
            "drop by keyboard": { w: 5, h: 5 },
            "model.run": { w: 6, h: 6 },
        },
    },
    {
        name: "minSize(3, 2)",
        options: {
            layout: pair(box("a", 0, 0, 4, 3)),
            constraints: [gridBounds, minMaxSize, minSize(3, 2)],
        },
        pointer: { side: "bottom-end", by: [-3, -2] },
        keys: [...times(3, "+ArrowLeft"), ...times(3, "+ArrowUp")],
        drop: { item: { w: 1, h: 1 }, at: [5, 0], keys: ["+ArrowLeft"] },
        run: (g, env) =>
            g.model.run("item.resize", { itemId: "a", w: 1, h: 1 }, { env }),
        holds: (item) => {
            expect(item.w).toBeGreaterThanOrEqual(3);
            expect(item.h).toBeGreaterThanOrEqual(2);
        },
        want: {
            pointer: { w: 3, h: 2 },
            keyboard: { w: 3, h: 2 },
            "drop by pointer": { x: 5, w: 3, h: 2 },
            "drop by keyboard": { w: 3, h: 2 },
            "model.run": { w: 3, h: 2 },
        },
    },
    {
        name: "maxSize(4, 3)",
        options: {
            layout: pair(),
            constraints: [gridBounds, minMaxSize, maxSize(4, 3)],
        },
        pointer: { side: "bottom-end", by: [5, 5] },
        keys: [...times(4, "+ArrowRight"), ...times(4, "+ArrowDown")],
        drop: { item: { w: 8, h: 6 }, at: [2, 0], keys: ["+ArrowRight"] },
        run: (g, env) =>
            g.model.run("item.resize", { itemId: "a", w: 9, h: 9 }, { env }),
        holds: (item) => {
            expect(item.w).toBeLessThanOrEqual(4);
            expect(item.h).toBeLessThanOrEqual(3);
        },
        want: {
            pointer: { w: 4, h: 3 },
            keyboard: { w: 4, h: 3 },
            "drop by pointer": { w: 4, h: 3 },
            "drop by keyboard": { w: 4, h: 3 },
            "model.run": { w: 4, h: 3 },
        },
    },
];

/** The id a drop commits under. */
const NEW = "new";

describe.each(CASES)("$name applies to every input", (c) => {
    /** checks the item `id` came out as the constraint and the case say */
    function landed(g: Grid, id: string, kind: Kind): void {
        expect(g.view().gesture).toBeUndefined();
        const item = itemOf(g, id);
        expect(item).toMatchObject(c.want[kind]);
        c.holds(item, g);
        expect(overlaps(g.model.get("layout"))).toBe(false);
    }

    it("by pointer", () => {
        const g = grid(c.options);
        const gesture = c.pointer;
        if ("to" in gesture) {
            const start = itemOf(g, "a");
            const held = pointer(g.item("a"), ...at(start.x, start.y));
            held.move(...at(...gesture.to));
            expect(g.view().gesture?.kind).toBe("move");
            held.release(...at(...gesture.to));
        } else {
            const [dx, dy] = gesture.by;
            const held = pointer(g.resizeHandle("a", gesture.side), 500, 100);
            held.move(500 + dx * COL, 100 + dy * ROW);
            expect(g.view().gesture?.kind).toBe("resize");
            held.release(500 + dx * COL, 100 + dy * ROW);
        }
        landed(g, "a", "pointer");
    });

    it("by keyboard", () => {
        const g = grid(c.options);
        const a = g.item("a");
        key(a, " ");
        expect(g.view().gesture?.kind).toBe("keyboard");
        press(a, c.keys);
        key(a, " ");
        landed(g, "a", "keyboard");
    });

    it("by a drop from a drag source, by pointer", () => {
        const g = grid(c.options);
        const source = g.source({ item: c.drop.item, itemId: NEW });
        const [x, y] = c.drop.at;
        const point = centre(
            g,
            x,
            y,
            Math.min(c.drop.item.w, 12),
            c.drop.item.h,
        );
        const held = pointer(source, WIDTH + 200, 20);
        held.move(...point);
        expect(g.view().gesture).toMatchObject({
            kind: "drop",
            outside: false,
        });
        held.release(...point);
        expect(g.events.at(-1)?.type).toBe("drop");
        landed(g, NEW, "drop by pointer");
    });

    it("by a drop from a drag source, by keyboard", () => {
        const g = grid(c.options);
        const source = g.source({ item: c.drop.item, itemId: NEW });
        source.focus();
        key(source, "Enter");
        expect(g.view().gesture).toMatchObject({
            kind: "drop",
            source: "keyboard",
        });
        press(source, c.drop.keys);
        key(source, "Enter");
        expect(g.events.at(-1)?.type).toBe("drop");
        landed(g, NEW, "drop by keyboard");
    });

    it("by model.run", () => {
        const g = grid(c.options);
        const result = c.run(
            g,
            c.pixels ? envOf(g, c.options.shown) : undefined,
        );
        expect(result).toMatchObject({ ok: true });
        expect(result).not.toHaveProperty("value.skipped");
        landed(g, "a", "model.run");
    });
});

describe("pixel constraints without an engine's pixels", () => {
    const byName = (name: string) => {
        const found = CASES.find((c) => c.name === name);
        if (!found) throw new Error(name);
        return found;
    };

    it("a plain model.run skips them and its result says which", () => {
        const ratio = byName("aspectRatio(16 / 9)");
        const sized = grid(ratio.options);
        expect(ratio.run(sized, undefined)).toMatchObject({
            ok: true,
            value: { skipped: [aspectRatio(RATIO).name] },
        });
        // the height asked, not the ratio's
        expect(itemOf(sized, "a")).toMatchObject({ w: 6, h: 1 });

        const bounds = byName("containerBounds");
        const moved = grid(bounds.options);
        expect(bounds.run(moved, undefined)).toMatchObject({
            ok: true,
            value: { skipped: ["containerBounds"] },
        });
        // below the rows the root shows: nothing bounds it without them
        expect(itemOf(moved, "a")).toMatchObject({ x: 0, y: 6 });
    });

    it("lists only the constraints the command uses", () => {
        const ratio = byName("aspectRatio(16 / 9)");
        const g = grid(ratio.options);
        // a move uses no size constraint: aspectRatio is not skipped, it does not apply
        const result = g.model.run("item.move", { itemId: "a", x: 3, y: 0 });
        expect(result).toMatchObject({ ok: true });
        expect(result).not.toHaveProperty("value.skipped");
    });
});

// ─── preview and commit agree (a property test) ──────────────────────────────────────────────

/** A seeded pseudo-random generator (mulberry32): the same seed, the same gestures. */
function random(seed: number) {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo: number, hi: number) =>
        lo + Math.floor(next() * (hi - lo + 1));
    function pick<T>(list: readonly T[]): T {
        const value = list[int(0, list.length - 1)];
        if (value === undefined) throw new Error("empty list");
        return value;
    }
    return { int, pick, coin: () => next() < 0.5 };
}

type Random = ReturnType<typeof random>;

const SIDES: readonly ResizeSide[] = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
];
const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;

const MANY = (extra: Partial<LayoutItem> = {}) =>
    frozen([
        box("a", 0, 0, 2, 2, extra),
        box("b", 2, 0, 3, 2),
        box("c", 5, 0, 2, 3, { minW: 1, maxW: 3, minH: 2, maxH: 4 }),
        box("d", 0, 2, 4, 1),
        box("e", 9, 0, 3, 3),
    ]);
const IDS = ["a", "b", "c", "d", "e"] as const;

/** Random arrows, some with Shift. */
const randomKeys = (r: Random) =>
    Array.from(
        { length: r.int(1, 8) },
        () => `${r.coin() ? "+" : ""}${r.pick(ARROWS)}`,
    );

/**
 * One random gesture, ended as it would be by a person: what it showed last before it ended
 * (the layout as it was, when it never started), and the layout it committed.
 */
function gesture(
    g: Grid,
    r: Random,
    n: number,
    ids: readonly string[] = IDS,
): { shown: Layout; committed: Layout; what: string } {
    const before = g.model.get("layout");
    const shown = () => g.view().gesture?.preview ?? before;
    const kind = r.int(0, 4);
    let last: Layout = before;
    /** the gesture, told: what a failure names */
    let what = "";
    if (kind === 0) {
        // a pointer move, through a few cells
        const start = itemOf(g, r.pick(ids));
        const held = pointer(g.item(start.id), ...at(start.x, start.y));
        let point = at(start.x, start.y);
        for (let step = r.int(1, 3); step > 0; step--) {
            const [x, y] = at(r.int(-1, 12), r.int(0, 7));
            point = [x + r.int(0, 60), y + r.int(0, 40)];
            held.move(...point);
        }
        what = `pointer move of ${start.id} to ${point}`;
        last = shown();
        held.release(...point);
    } else if (kind === 1) {
        // a pointer resize from any side
        const id = r.pick(ids);
        const side = r.pick(SIDES);
        const held = pointer(g.resizeHandle(id, side), 900, 300);
        let point: readonly [number, number] = [900, 300];
        for (let step = r.int(1, 2); step > 0; step--) {
            point = [
                900 + r.int(-4, 4) * COL + r.int(-60, 60),
                300 + r.int(-3, 3) * ROW + r.int(-30, 30),
            ];
            held.move(...point);
        }
        what = `pointer resize of ${id} from ${side} by ${point[0] - 900},${point[1] - 300}`;
        last = shown();
        held.release(...point);
    } else if (kind === 2) {
        // the keyboard: grab, arrows, drop
        const id = r.pick(ids);
        const element = g.item(id);
        const keys = randomKeys(r);
        what = `keyboard on ${id}: ${keys}`;
        key(element, " ");
        press(element, keys);
        last = shown();
        key(element, " ");
    } else if (kind === 3) {
        // a drop from a drag source, by pointer
        const item = { w: r.int(1, 4), h: r.int(1, 3) };
        const source = g.source({ item, itemId: `drop-${n}` });
        const held = pointer(source, WIDTH + 200, 20);
        let point: readonly [number, number] = [WIDTH + 200, 20];
        for (let step = r.int(1, 2); step > 0; step--) {
            point = [r.int(0, WIDTH), r.int(0, 8 * ROW)];
            held.move(...point);
        }
        what = `pointer drop of ${item.w}×${item.h} at ${point}`;
        last = shown();
        held.release(...point);
    } else {
        // a drop from a drag source, by keyboard
        const item = { w: r.int(1, 4), h: r.int(1, 3) };
        const source = g.source({ item, itemId: `drop-${n}` });
        const keys = randomKeys(r);
        what = `keyboard drop of ${item.w}×${item.h}: ${keys}`;
        source.focus();
        key(source, "Enter");
        press(source, keys);
        last = shown();
        key(source, "Enter");
    }
    expect(g.view().gesture).toBeUndefined();
    return { shown: last, committed: g.model.get("layout"), what };
}

const PROPERTY: readonly {
    readonly name: string;
    readonly options: GridOptions;
}[] = [
    ...CASES.map((c) => ({
        name: c.name,
        options: { ...c.options, layout: MANY() },
    })),
    {
        name: "snapToGrid(3) on one item, from the registry",
        options: {
            layout: MANY({ constraints: [{ name: "snapToGrid", args: [3] }] }),
            constraintRegistry: { snapToGrid, aspectRatio },
        },
    },
    {
        name: "aspectRatio(16 / 9) on one item, from the registry",
        options: {
            layout: MANY({
                constraints: [{ name: "aspectRatio", args: [RATIO] }],
            }),
            constraintRegistry: { snapToGrid, aspectRatio },
        },
    },
    {
        name: "containerBounds, the root as tall as its layout (autoSize)",
        options: {
            layout: MANY(),
            constraints: [containerBounds, minMaxSize],
        },
    },
];

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const GESTURES = 6;

describe.each(PROPERTY)("preview and commit agree: $name", ({ options }) => {
    it.each(SEEDS)("for the gestures of seed %i", (seed) => {
        const r = random(seed);
        const g = grid(options);
        for (let n = 0; n < GESTURES; n++) {
            const { shown, committed, what } = gesture(g, r, n);
            expect(boxes(committed), `gesture ${n}, ${what}`).toEqual(
                boxes(shown),
            );
        }
    });
});

// ─── compaction and a position constraint settle in one pass ─────────────────────────────────

const SETTLING: readonly {
    readonly name: string;
    readonly options: GridOptions;
}[] = [
    {
        name: "snapToGrid(3)",
        options: { constraints: [gridBounds, minMaxSize, snapToGrid(3)] },
    },
    {
        name: "boundedY",
        options: { maxRows: 6, constraints: [boundedY, minMaxSize] },
    },
    {
        name: "gridBounds",
        options: { maxRows: 6, constraints: [gridBounds, minMaxSize] },
    },
    {
        name: "containerBounds",
        options: {
            constraints: [containerBounds, minMaxSize],
            engine: { autoSize: false },
            shown: 6 * ROW - 9 + 2 * PAD,
        },
    },
];

describe.each(SETTLING)("vertical compaction with $name", ({ options }) => {
    /** valid, and compacting it again gives the very same layout */
    function settled(g: Grid): void {
        const layout = g.model.get("layout");
        expect(overlaps(layout)).toBe(false);
        for (const entry of layout) {
            expect(entry.x).toBeGreaterThanOrEqual(0);
            expect(entry.y).toBeGreaterThanOrEqual(0);
            expect(entry.x + entry.w).toBeLessThanOrEqual(12);
        }
        expect(compactLayout(layout, g.model.get("rules"))).toBe(layout);
    }

    it.each(SEEDS)("settles in one pass, seed %i", (seed) => {
        const r = random(seed);
        const g = grid({ ...options, layout: MANY() });
        settled(g);
        for (let n = 0; n < GESTURES; n++) {
            const id = r.pick(IDS);
            const item = itemOf(g, id);
            const payload = Object.freeze({
                itemId: id,
                x: r.int(0, 12 - item.w),
                y: r.int(0, 8),
            });
            expect(
                g.model.run("item.move", payload, {
                    env: envOf(g, options.shown),
                }),
            ).toMatchObject({ ok: true });
            settled(g);
            gesture(g, r, n);
            settled(g);
        }
    });
});

// ─── what the property test found, as single cases ───────────────────────────────────────────

describe("the property test's cases", () => {
    it("snapToGrid(3) without compaction: the free mode's swap may move the snapped item (react-grid-layout#1982)", () => {
        const g = grid({
            layout: frozen([...MANY(), box("z", 3, 8, 1, 3)]),
            compactor: noCompactor,
            constraints: [gridBounds, minMaxSize, snapToGrid(3)],
        });
        expect(
            g.model.run("item.move", { itemId: "z", x: 3, y: 0 }),
        ).toMatchObject({
            ok: true,
        });
        // the constraint shapes the ask (3, 0); the push that follows swaps z with what it lands
        // on in free mode, so it may end on another row: documented, and the layout stays valid
        expect(itemOf(g, "z")).toMatchObject({ x: 3 });
        expect(overlaps(g.model.get("layout"))).toBe(false);
    });

    it("containerBounds with autoSize: a pointer drop commits what it previewed", () => {
        const g = grid({
            layout: frozen([...MANY(), box("drop-0", 5, 3, 2, 1)]),
            constraints: [containerBounds, minMaxSize],
        });
        const source = g.source({ item: { w: 1, h: 3 }, itemId: NEW });
        const held = pointer(source, WIDTH + 200, 20);
        held.move(825, 602);
        const shown = g.view().gesture?.preview ?? [];
        held.release(825, 602);
        expect(boxes(g.model.get("layout"))).toEqual(boxes(shown));
    });
});

// ─── inputs are never mutated ────────────────────────────────────────────────────────────────

describe("the layouts given", () => {
    it("are never mutated, whatever the constraints do", () => {
        for (const c of CASES) {
            const layout = c.options.layout ?? [];
            const copy = structuredClone(layout);
            const g = grid(c.options);
            const r = random(42);
            const ids = layout.map((entry) => entry.id);
            for (let n = 0; n < GESTURES; n++) gesture(g, r, n, ids);
            c.run(g, c.pixels ? envOf(g, c.options.shown) : undefined);
            expect(Object.isFrozen(layout), c.name).toBe(true);
            expect(layout, c.name).toEqual(copy);
        }
    });
});
