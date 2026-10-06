// The model: the grid's source of truth (D3). Commands run through the middleware chain to their
// handler, which returns a new state or why it refuses; a committed change is told to the
// listeners once. Every committed layout is valid: in bounds, settled, and never overlapping
// unless `allowOverlap`.

import { bottom as bottomOf, collides, collisions } from "../layout/collision";
import { verticalCompactor } from "../layout/compact";
import {
    type ConstraintEnv,
    constrainMove,
    constrainPlace,
    constrainResize,
    constraintsProblem,
    defaultConstraints,
    itemConstraintsProblem,
    skippedConstraints,
} from "../layout/constraints";
import {
    addItem,
    moveItem,
    placeItem,
    removeItem,
    resizeItem,
} from "../layout/edit";
import { layoutProblems, normaliseLayout } from "../layout/normalise";
import {
    type Breakpoints,
    breakpointFor,
    generateLayout,
    sortBreakpoints,
} from "../layout/responsive";
import {
    type Layout,
    type LayoutItem,
    type LayoutRules,
    RESIZE_SIDES,
    type ResizeSide,
} from "../layout/types";
import {
    type CommandContext,
    type CommandErrorCode,
    type CommandFailure,
    type CommandListener,
    type CommandMap,
    type CommandName,
    type CommandResult,
    DEFAULT_BREAKPOINT,
    type GridLayoutModel,
    type GridLayoutModelOptions,
    type GridLayoutState,
    type GridSettings,
    type ItemSettings,
    type Middleware,
    type PlaceResult,
    type QueryKey,
    type QueryMap,
    type QuestionKey,
    type QuestionMap,
} from "./types";

/** A command's failure: `code`, and a message saying why. */
export function fail(code: CommandErrorCode, message: string): CommandFailure {
    return { ok: false, error: { code, message } };
}

/** The vetoed result a middleware returns to stop a command. */
export function veto(message = "vetoed by a middleware"): CommandFailure {
    return fail("vetoed", message);
}

/** A handler's outcome: the state it leaves and the command's value, or why it refuses. */
type Applied<R> =
    | {
          readonly ok: true;
          readonly value: { state: GridLayoutState; value: R };
      }
    | CommandFailure;

/** A payload that is not what the command takes: caught and turned into `invalid_payload`. */
class PayloadError extends Error {}

function need(condition: unknown, message: string): asserts condition {
    if (!condition) throw new PayloadError(message);
}

const isInteger = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value);

const isLimit = (value: unknown) =>
    value === undefined ||
    (isInteger(value) && value >= 1) ||
    value === Number.POSITIVE_INFINITY;

/** The active breakpoint's layout. */
export function activeLayout(state: GridLayoutState): Layout {
    return state.layouts[state.breakpoint] ?? [];
}

/** What every layout change of `state` obeys. */
export function rulesOf(state: GridLayoutState): LayoutRules {
    return {
        cols: state.cols,
        maxRows: state.maxRows,
        compactor: state.compactor,
        preventCollision: state.preventCollision,
        allowOverlap: state.allowOverlap,
        constraints: state.constraints,
        constraintRegistry: state.constraintRegistry,
    };
}

/** `state` with `breakpoint`'s layout replaced (the same state when it is the same layout). */
function withLayoutAt(
    state: GridLayoutState,
    breakpoint: string,
    layout: Layout,
): GridLayoutState {
    if (layout === state.layouts[breakpoint]) return state;
    return Object.freeze({
        ...state,
        layouts: Object.freeze({ ...state.layouts, [breakpoint]: layout }),
    });
}

function done<R>(state: GridLayoutState, value: R): Applied<R> {
    return { ok: true, value: { state, value } };
}

/** Throws a {@link PayloadError} when an item names a constraint that cannot apply. */
function checkItemConstraints(layout: Layout, rules: LayoutRules): void {
    for (const item of layout) {
        if (!item.constraints) continue;
        const problem = itemConstraintsProblem(item, rules.constraintRegistry);
        need(problem === undefined, `item "${item.id}": ${problem ?? ""}`);
    }
}

function normalised(layout: Layout, rules: LayoutRules): Layout {
    const result = normaliseLayout(layout, rules);
    if (!result.ok) {
        throw new PayloadError(
            result.problems
                .map((problem) =>
                    problem.index === undefined
                        ? problem.message
                        : `item ${problem.index}: ${problem.message}`,
                )
                .join("; "),
        );
    }
    checkItemConstraints(result.layout, rules);
    return result.layout;
}

/** What every layout change at `breakpoint` obeys: the grid's rules, in that breakpoint's columns. */
function rulesAt(state: GridLayoutState, breakpoint: string): LayoutRules {
    return {
        ...rulesOf(state),
        cols: state.columns[breakpoint] ?? state.cols,
    };
}

/** Throws a {@link PayloadError} unless `name` is one of `state`'s breakpoints. */
function knownBreakpoint(
    state: GridLayoutState,
    name: unknown,
): asserts name is string {
    need(
        typeof name === "string" && Object.hasOwn(state.breakpoints, name),
        `no breakpoint "${String(name)}"`,
    );
}

/** The breakpoint a command edits, its layout and its rules. */
interface Target {
    readonly breakpoint: string;
    readonly layout: Layout;
    readonly rules: LayoutRules;
}

/** The breakpoint a payload names (the active one by default), or why it cannot be edited. */
function targetOf(
    state: GridLayoutState,
    breakpoint: unknown,
): Target | CommandFailure {
    const name = breakpoint ?? state.breakpoint;
    knownBreakpoint(state, name);
    // the active one without a layout (its generation refused) is empty: commands make one
    const layout =
        state.layouts[name] ?? (name === state.breakpoint ? [] : undefined);
    if (!layout) {
        return fail("not_found", `breakpoint "${name}" has no layout yet`);
    }
    return { breakpoint: name, layout, rules: rulesAt(state, name) };
}

/**
 * `state` with an item added to (or removed from) another breakpoint than the active one also
 * added to (removed from) the active one: every breakpoint shows the same items, and the others
 * follow the active one at their next activation (R3).
 */
function alsoActive(
    state: GridLayoutState,
    target: Target,
    change: (layout: Layout, rules: LayoutRules) => Layout,
): GridLayoutState {
    const active = state.layouts[state.breakpoint];
    if (target.breakpoint === state.breakpoint || !active) return state;
    return withLayoutAt(
        state,
        state.breakpoint,
        change(active, rulesAt(state, state.breakpoint)),
    );
}

/** The item `itemId` of `layout`, or the `not_found` failure. */
function found(layout: Layout, itemId: unknown): LayoutItem | CommandFailure {
    need(typeof itemId === "string", "itemId must be a string");
    const item = layout.find((entry) => entry.id === itemId);
    return item ?? fail("not_found", `no item "${itemId}"`);
}

const isFailure = <T extends object>(
    value: T | CommandFailure,
): value is CommandFailure => "ok" in value;

function itemIn(layout: Layout, itemId: string): LayoutItem {
    const item = layout.find((entry) => entry.id === itemId);
    if (item === undefined) throw new Error(`lost item "${itemId}"`);
    return item;
}

/** What `item.configure` may change: an item's limits and flags. */
const ITEM_SETTINGS = [
    "minW",
    "maxW",
    "minH",
    "maxH",
    "static",
    "draggable",
    "resizable",
    "constraints",
] as const satisfies readonly (keyof ItemSettings)[];

/** Throws a {@link PayloadError} when `breakpoints` is not a map of minimum widths. */
function checkBreakpoints(breakpoints: unknown): Breakpoints {
    need(
        typeof breakpoints === "object" &&
            breakpoints !== null &&
            Object.keys(breakpoints).length > 0,
        "breakpoints must name at least one breakpoint",
    );
    for (const [name, min] of Object.entries(breakpoints)) {
        need(
            typeof min === "number" && Number.isFinite(min) && min >= 0,
            `breakpoint "${name}" must have a minimum width of 0 or more`,
        );
    }
    return breakpoints as Breakpoints;
}

/**
 * Each breakpoint's columns from `cols` (one number for all, or one per breakpoint), or throws a
 * {@link PayloadError}: every breakpoint has columns, and the map names no other.
 */
function columnsFor(
    breakpoints: Breakpoints,
    cols: unknown,
): Readonly<Record<string, number>> {
    const isCols = (value: unknown) => isInteger(value) && value >= 1;
    if (typeof cols === "number") {
        need(isCols(cols), "cols must be an integer of at least 1");
        return Object.freeze(
            Object.fromEntries(
                Object.keys(breakpoints).map((name) => [name, cols]),
            ),
        );
    }
    need(
        typeof cols === "object" && cols !== null,
        "cols must be a number, or one per breakpoint",
    );
    const map = cols as Record<string, unknown>;
    for (const name of Object.keys(breakpoints)) {
        need(
            isCols(map[name]),
            `cols for breakpoint "${name}" must be an integer of at least 1`,
        );
    }
    for (const name of Object.keys(map)) {
        need(
            Object.hasOwn(breakpoints, name),
            `cols names no breakpoint "${name}"`,
        );
    }
    return Object.freeze({ ...(map as Record<string, number>) });
}

/**
 * The columns `state` has for `breakpoints` (new breakpoints changed without new columns): one
 * number when every breakpoint has the same, else the map of the breakpoints that stay.
 */
function keptColumns(
    state: GridLayoutState,
    breakpoints: Breakpoints,
): number | Readonly<Record<string, number>> {
    const values = new Set(Object.values(state.columns));
    const [only] = values;
    if (values.size === 1 && only !== undefined) return only;
    return Object.fromEntries(
        Object.entries(state.columns).filter(([name]) =>
            Object.hasOwn(breakpoints, name),
        ),
    );
}

/** Whether two lists hold the same values in the same order. */
function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
    return (
        a.length === b.length && a.every((value, index) => value === b[index])
    );
}

/** Whether two maps hold the same values under the same keys. */
function sameMap<T>(
    a: Readonly<Record<string, T>>,
    b: Readonly<Record<string, T>>,
): boolean {
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key])
    );
}

/** Throws a {@link PayloadError} when `settings` is not what `grid.configure` takes. */
function checkGridSettings(settings: GridSettings): void {
    need(
        typeof settings === "object" && settings !== null,
        "settings must be an object",
    );
    const { maxRows, compactor, preventCollision, allowOverlap, constraints } =
        settings;
    if (constraints !== undefined) {
        const problem = constraintsProblem(constraints);
        need(problem === undefined, problem ?? "");
    }
    need(
        isLimit(maxRows),
        "maxRows must be an integer of at least 1, or Infinity",
    );
    need(
        compactor === undefined ||
            (typeof compactor === "object" &&
                compactor !== null &&
                typeof compactor.compact === "function"),
        "compactor must have a compact function",
    );
    for (const [key, value] of [
        ["preventCollision", preventCollision],
        ["allowOverlap", allowOverlap],
    ] as const) {
        need(
            value === undefined || typeof value === "boolean",
            `${key} must be a boolean`,
        );
    }
}

/** Every layout of `layouts` checked, corrected and settled in its breakpoint's columns. */
function settledLayouts(
    state: GridLayoutState,
    layouts: unknown,
): Readonly<Record<string, Layout>> {
    need(
        typeof layouts === "object" && layouts !== null,
        "layouts must map breakpoints to layouts",
    );
    const entries = Object.entries(layouts as Record<string, Layout>).map(
        ([name, layout]) => {
            need(
                Object.hasOwn(state.breakpoints, name),
                `layouts names no breakpoint "${name}"`,
            );
            return [name, normalised(layout, rulesAt(state, name))] as const;
        },
    );
    return Object.freeze(Object.fromEntries(entries));
}

/** Under `preventCollision` (and without `allowOverlap`), the item `box` would land on. */
function collision(
    state: GridLayoutState,
    layout: Layout,
    box: LayoutItem,
): LayoutItem | undefined {
    if (!state.preventCollision || state.allowOverlap) return undefined;
    return layout.find((other) => collides(other, box));
}

/** A placing command's value: the item, the layout, and the pixel constraints it skipped. */
function placed(
    item: LayoutItem,
    layout: Layout,
    rules: LayoutRules,
    env: ConstraintEnv,
    kind: "position" | "size" | "both",
): PlaceResult {
    const skipped = skippedConstraints(rules, item, env, kind);
    return skipped.length > 0 ? { item, layout, skipped } : { item, layout };
}

type Handlers = {
    [C in CommandName]: (
        state: GridLayoutState,
        payload: CommandMap[C]["payload"],
        env: ConstraintEnv,
    ) => Applied<CommandMap[C]["result"]>;
};

const handlers: Handlers = {
    "layout.set": (state, { layout, breakpoint }) => {
        const name = breakpoint ?? state.breakpoint;
        knownBreakpoint(state, name);
        const next = normalised(layout, rulesAt(state, name));
        return done(withLayoutAt(state, name, next), { layout: next });
    },

    "item.add": (state, { item, breakpoint }, env) => {
        need(
            typeof item === "object" && item !== null,
            "item must be an object",
        );
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const { layout, rules } = target;
        need(
            !layout.some((entry) => entry.id === item.id),
            `id "${String(item.id)}" is already used`,
        );
        const problems = layoutProblems([
            { ...item, x: item.x ?? 0, y: item.y ?? 0 },
        ]);
        need(problems.length === 0, problems.map((p) => p.message).join("; "));
        checkItemConstraints([item as LayoutItem], rules);
        // `y: Infinity` means below everything, as in a layout
        const below = (of: Layout) =>
            item.y === Number.POSITIVE_INFINITY ? { y: bottomOf(of) } : {};
        const next = addItem(layout, { ...item, ...below(layout) }, rules, env);
        const added = itemIn(next, item.id);
        return done(
            alsoActive(
                withLayoutAt(state, target.breakpoint, next),
                target,
                (active, activeRules) =>
                    active.some((entry) => entry.id === item.id)
                        ? active
                        : addItem(
                              active,
                              { ...item, ...below(active) },
                              activeRules,
                              env,
                          ),
            ),
            placed(added, next, rules, env, "both"),
        );
    },

    "item.remove": (state, { itemId, breakpoint }) => {
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const item = found(target.layout, itemId);
        if (isFailure(item)) return item;
        const next = removeItem(target.layout, item.id, target.rules);
        return done(
            alsoActive(
                withLayoutAt(state, target.breakpoint, next),
                target,
                (active, activeRules) =>
                    removeItem(active, item.id, activeRules),
            ),
            { itemId: item.id },
        );
    },

    "item.move": (state, { itemId, x, y, breakpoint }, env) => {
        need(isInteger(x) && isInteger(y), "x and y must be integers");
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const { layout, rules } = target;
        const item = found(layout, itemId);
        if (isFailure(item)) return item;
        if (item.static) return fail("refused", `item "${item.id}" is static`);
        need(
            x >= 0 && y >= 0 && x + item.w <= rules.cols,
            `the cell ${x},${y} puts item "${item.id}" outside the grid`,
        );
        const to = constrainMove(item, x, y, rules, layout, env);
        const hit = collision(state, layout, { ...item, ...to });
        if (hit) {
            return fail(
                "collision",
                `item "${item.id}" would land on "${hit.id}"`,
            );
        }
        const next = moveItem(layout, item.id, x, y, rules, env);
        return done(
            withLayoutAt(state, target.breakpoint, next),
            placed(itemIn(next, item.id), next, rules, env, "position"),
        );
    },

    "item.resize": (
        state,
        { itemId, w, h, side = "bottom-end", breakpoint },
        env,
    ) => {
        need(isInteger(w) && isInteger(h), "w and h must be integers");
        need(
            RESIZE_SIDES.includes(side as ResizeSide),
            `no resize side "${String(side)}"`,
        );
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const { layout, rules } = target;
        const item = found(layout, itemId);
        if (isFailure(item)) return item;
        if (item.static) return fail("refused", `item "${item.id}" is static`);
        const rect = constrainResize(item, side, { w, h }, rules, layout, env);
        const hit = collision(state, layout, { ...item, ...rect });
        if (hit) {
            return fail(
                "collision",
                `item "${item.id}" would grow into "${hit.id}"`,
            );
        }
        const next = resizeItem(layout, item.id, { w, h }, side, rules, env);
        return done(
            withLayoutAt(state, target.breakpoint, next),
            placed(itemIn(next, item.id), next, rules, env, "size"),
        );
    },

    "item.place": (state, { itemId, x, y, w, h, breakpoint }, env) => {
        need(
            [x, y, w, h].every(isInteger) && w >= 1 && h >= 1,
            "x and y must be integers, w and h integers of at least 1",
        );
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const { layout, rules } = target;
        const item = found(layout, itemId);
        if (isFailure(item)) return item;
        if (item.static) return fail("refused", `item "${item.id}" is static`);
        need(
            x >= 0 && y >= 0 && x + w <= rules.cols,
            `the box ${x},${y} ${w}×${h} puts item "${item.id}" outside the grid`,
        );
        const box = constrainPlace(item, { x, y, w, h }, rules, layout, env);
        const hit = collision(state, layout, { ...item, ...box });
        if (hit) {
            return fail(
                "collision",
                `item "${item.id}" would land on "${hit.id}"`,
            );
        }
        const next = placeItem(layout, item.id, { x, y, w, h }, rules, env);
        return done(
            withLayoutAt(state, target.breakpoint, next),
            placed(itemIn(next, item.id), next, rules, env, "both"),
        );
    },

    "item.configure": (state, { itemId, settings, breakpoint }) => {
        need(
            typeof settings === "object" && settings !== null,
            "settings must be an object",
        );
        for (const key of ["minW", "maxW", "minH", "maxH"] as const) {
            need(
                isLimit(settings[key]),
                `${key} must be an integer of at least 1`,
            );
        }
        for (const key of ["static", "draggable", "resizable"] as const) {
            const value = settings[key];
            need(
                value === undefined || typeof value === "boolean",
                `${key} must be a boolean`,
            );
        }
        const target = targetOf(state, breakpoint);
        if (isFailure(target)) return target;
        const { layout } = target;
        const item = found(layout, itemId);
        if (isFailure(item)) return item;
        // only an item's limits and flags: its place and size go through move and resize
        const picked = Object.fromEntries(
            ITEM_SETTINGS.filter((key) => Object.hasOwn(settings, key)).map(
                (key) => [key, settings[key]],
            ),
        );
        if (
            Object.entries(picked).every(
                ([key, value]) => item[key as keyof LayoutItem] === value,
            )
        ) {
            return done(state, { item, layout });
        }
        const changed = layout.map((entry) =>
            entry === item ? { ...entry, ...picked } : entry,
        );
        const next = normalised(changed, target.rules);
        return done(withLayoutAt(state, target.breakpoint, next), {
            item: itemIn(next, item.id),
            layout: next,
        });
    },

    "grid.configure": (state, { settings }) => {
        checkGridSettings(settings);
        const { maxRows, compactor, preventCollision, allowOverlap } = settings;
        const constraints = settings.constraints ?? state.constraints;
        const breakpoints =
            settings.breakpoints === undefined
                ? state.breakpoints
                : checkBreakpoints(settings.breakpoints);
        // the active breakpoint gone: the one the settings name (the width's, from an adapter),
        // else the widest, becomes active, its layout generated from the one that goes
        const active = Object.hasOwn(breakpoints, state.breakpoint)
            ? state.breakpoint
            : settings.breakpoint !== undefined &&
                Object.hasOwn(breakpoints, settings.breakpoint)
              ? settings.breakpoint
              : (sortBreakpoints(breakpoints).at(-1) ?? state.breakpoint);
        const columns = columnsFor(
            breakpoints,
            settings.cols ?? keptColumns(state, breakpoints),
        );
        const configured: GridLayoutState = {
            ...state,
            breakpoints: sameMap(breakpoints, state.breakpoints)
                ? state.breakpoints
                : Object.freeze({ ...breakpoints }),
            columns: sameMap(columns, state.columns) ? state.columns : columns,
            breakpoint: active,
            cols: columns[active] ?? state.cols,
            maxRows: maxRows ?? state.maxRows,
            compactor: compactor ?? state.compactor,
            preventCollision: preventCollision ?? state.preventCollision,
            allowOverlap: allowOverlap ?? state.allowOverlap,
            constraints: sameList(constraints, state.constraints)
                ? state.constraints
                : Object.freeze([...constraints]),
        };
        // a breakpoint gone takes its layout; the others settle in their columns
        const normalisedLayouts = Object.entries(state.layouts)
            .filter(([breakpoint]) => Object.hasOwn(breakpoints, breakpoint))
            .map(
                ([breakpoint, layout]) =>
                    [
                        breakpoint,
                        normalised(layout, rulesAt(configured, breakpoint)),
                    ] as const,
            );
        // the same layouts object when no layout changed: listeners can tell a rule's change
        // from a layout's (`before.layouts !== after.layouts`)
        if (
            active !== state.breakpoint &&
            !normalisedLayouts.some(([breakpoint]) => breakpoint === active)
        ) {
            normalisedLayouts.push([
                active,
                generateLayout({
                    layouts: state.layouts,
                    breakpoints,
                    target: active,
                    from: state.breakpoint,
                    rules: rulesAt(configured, active),
                }),
            ]);
        }
        const layouts =
            normalisedLayouts.length === Object.keys(state.layouts).length &&
            normalisedLayouts.every(
                ([breakpoint, layout]) => layout === state.layouts[breakpoint],
            )
                ? state.layouts
                : Object.freeze(Object.fromEntries(normalisedLayouts));
        const same =
            configured.breakpoint === state.breakpoint &&
            configured.breakpoints === state.breakpoints &&
            configured.columns === state.columns &&
            configured.maxRows === state.maxRows &&
            configured.compactor === state.compactor &&
            configured.preventCollision === state.preventCollision &&
            configured.allowOverlap === state.allowOverlap &&
            configured.constraints === state.constraints &&
            layouts === state.layouts;
        return done(same ? state : Object.freeze({ ...configured, layouts }), {
            rules: rulesOf(configured),
        });
    },

    "breakpoint.set": (state, { breakpoint }) => {
        knownBreakpoint(state, breakpoint);
        const cols = state.columns[breakpoint] ?? state.cols;
        if (breakpoint === state.breakpoint)
            return done(state, { breakpoint, cols });
        const switched: GridLayoutState = Object.freeze({
            ...state,
            breakpoint,
            cols,
        });
        // a layout it has, with other items than the one before: brought up to date in the same
        // change (a missing one is generated right after, as a command of its own)
        const own = state.layouts[breakpoint];
        const next =
            own && otherItems(own, state.layouts[state.breakpoint])
                ? withLayoutAt(
                      switched,
                      breakpoint,
                      generateLayout({
                          layouts: state.layouts,
                          breakpoints: state.breakpoints,
                          target: breakpoint,
                          from: state.breakpoint,
                          rules: rulesAt(switched, breakpoint),
                      }),
                  )
                : switched;
        return done(next, { breakpoint, cols });
    },

    "layouts.set": (state, { layouts }) => {
        const next = settledLayouts(state, layouts);
        const same =
            Object.keys(next).length === Object.keys(state.layouts).length &&
            Object.entries(next).every(
                ([breakpoint, layout]) => layout === state.layouts[breakpoint],
            );
        return same
            ? done(state, { layouts: state.layouts })
            : done(Object.freeze({ ...state, layouts: next }), {
                  layouts: next,
              });
    },

    "layouts.generate": (state, { breakpoint, from }) => {
        knownBreakpoint(state, breakpoint);
        if (from !== undefined) knownBreakpoint(state, from);
        const layout = generateLayout({
            layouts: state.layouts,
            breakpoints: state.breakpoints,
            target: breakpoint,
            from,
            rules: rulesAt(state, breakpoint),
        });
        return done(withLayoutAt(state, breakpoint, layout), { layout });
    },
};

/** Whether two layouts hold different items (ids), whatever their places. */
function otherItems(a: Layout | undefined, b: Layout | undefined): boolean {
    if (!a || !b) return false;
    if (a.length !== b.length) return true;
    const ids = new Set(a.map((item) => item.id));
    return b.some((item) => !ids.has(item.id));
}

/** The commands' names, for tools and guards (the naming test checks it lists every one). */
export const COMMANDS = [
    "layout.set",
    "item.add",
    "item.remove",
    "item.move",
    "item.resize",
    "item.place",
    "item.configure",
    "grid.configure",
    "breakpoint.set",
    "layouts.set",
    "layouts.generate",
] as const satisfies readonly CommandName[];

/** A grid layout's model, from its options (an invalid initial layout throws a `TypeError`). */
export function createGridLayoutModel(
    options: GridLayoutModelOptions = {},
): GridLayoutModel {
    let breakpoints: Breakpoints;
    let columns: Readonly<Record<string, number>>;
    try {
        checkGridSettings(options);
        breakpoints = Object.freeze({
            ...checkBreakpoints(
                options.breakpoints ?? { [DEFAULT_BREAKPOINT]: 0 },
            ),
        });
        columns = columnsFor(breakpoints, options.cols ?? 12);
        need(
            options.breakpoint === undefined ||
                Object.hasOwn(breakpoints, options.breakpoint),
            `no breakpoint "${String(options.breakpoint)}"`,
        );
    } catch (error) {
        throw new TypeError(
            `invalid options: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
    // the widest breakpoint until the grid is measured
    const breakpoint =
        options.breakpoint ??
        sortBreakpoints(breakpoints).at(-1) ??
        DEFAULT_BREAKPOINT;
    const blank: GridLayoutState = {
        cols: columns[breakpoint] ?? 12,
        columns,
        breakpoints,
        maxRows: options.maxRows ?? Number.POSITIVE_INFINITY,
        compactor: options.compactor ?? verticalCompactor,
        preventCollision: options.preventCollision === true,
        allowOverlap: options.allowOverlap === true,
        constraints: Object.freeze([
            ...(options.constraints ?? defaultConstraints),
        ]),
        constraintRegistry: Object.freeze({ ...options.constraintRegistry }),
        breakpoint,
        layouts: {},
    };
    const given: Record<string, Layout> = {
        ...options.layouts,
        ...(options.layout === undefined
            ? {}
            : { [breakpoint]: options.layout }),
    };
    const settled: Record<string, Layout> = {};
    for (const [name, layout] of Object.entries(given)) {
        if (!Object.hasOwn(breakpoints, name)) {
            throw new TypeError(
                `invalid options: layouts names no breakpoint "${name}"`,
            );
        }
        const result = normaliseLayout(layout, rulesAt(blank, name));
        if (!result.ok) {
            throw new TypeError(
                `invalid layout: ${result.problems.map((problem) => problem.message).join("; ")}`,
            );
        }
        try {
            checkItemConstraints(result.layout, rulesAt(blank, name));
        } catch (error) {
            throw new TypeError(
                `invalid layout: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        settled[name] = result.layout;
    }
    let layouts: Readonly<Record<string, Layout>> = Object.freeze(settled);
    // the starting breakpoint's layout, generated when only others are given (empty otherwise)
    if (!layouts[breakpoint]) {
        layouts = Object.freeze({
            ...layouts,
            [breakpoint]: generateLayout({
                layouts,
                breakpoints,
                target: breakpoint,
                from: undefined,
                rules: rulesAt(blank, breakpoint),
            }),
        });
    }
    let state: GridLayoutState = Object.freeze({ ...blank, layouts });
    const middlewares: Middleware[] = [];
    const listeners = new Set<CommandListener>();
    const queue: {
        command: CommandName;
        payload: unknown;
        env: ConstraintEnv;
    }[] = [];
    /** a run without the engine's pixels */
    const noEnv: ConstraintEnv = Object.freeze({});
    let running = false;

    /** The chain, then the handler; returns the new state (uncommitted), value and payload. */
    function execute(
        command: CommandName,
        payload: unknown,
        env: ConstraintEnv,
        dryRun: boolean,
    ): CommandResult<{
        state: GridLayoutState;
        value: unknown;
        payload: unknown;
    }> {
        if (!Object.hasOwn(handlers, command)) {
            return fail("unknown_command", `no command "${String(command)}"`);
        }
        // the union of payloads is checked by the handler that reads it
        const ctx = {
            command,
            payload: payload ?? {},
            dryRun,
            state,
            env,
        } as CommandContext;
        let applied: Applied<unknown> | undefined;
        const step = (index: number): CommandResult<unknown> => {
            const middleware = middlewares[index];
            if (!middleware) {
                const handler = handlers[ctx.command] as (
                    state: GridLayoutState,
                    payload: unknown,
                    env: ConstraintEnv,
                ) => Applied<unknown>;
                try {
                    applied = handler(state, ctx.payload, env);
                } catch (error) {
                    // a payload of the wrong shape: a command never throws on bad input
                    applied = fail(
                        "invalid_payload",
                        error instanceof Error ? error.message : String(error),
                    );
                }
                return applied.ok
                    ? { ok: true, value: applied.value.value }
                    : applied;
            }
            let called = false;
            let nextResult: CommandResult<unknown> | undefined;
            const next = () => {
                called = true;
                nextResult = step(index + 1);
                return nextResult;
            };
            let returned: CommandResult<unknown> | undefined;
            try {
                returned = middleware(ctx, next);
            } catch (error) {
                return fail(
                    "middleware_error",
                    error instanceof Error ? error.message : String(error),
                );
            }
            if (returned) return returned;
            if (called && nextResult) return nextResult;
            return veto();
        };
        const result = step(0);
        if (!result.ok) return result;
        if (!applied?.ok) {
            // a middleware answered without running the command: nothing changes
            return {
                ok: true,
                value: { state, value: result.value, payload: ctx.payload },
            };
        }
        return {
            ok: true,
            value: {
                state: applied.value.state,
                value: result.value,
                payload: ctx.payload,
            },
        };
    }

    function commit(
        command: CommandName,
        payload: unknown,
        env: ConstraintEnv,
    ): CommandResult<unknown> {
        if (running) {
            queue.push({ command, payload, env });
            return fail(
                "queued",
                "issued while another command ran: it runs right after",
            );
        }
        // running until the listeners are told: a command a listener issues is queued, so every
        // listener sees the events in order
        running = true;
        let outcome: ReturnType<typeof execute>;
        try {
            outcome = execute(command, payload, env, false);
            if (outcome.ok && outcome.value.state !== state) {
                const before = state;
                state = outcome.value.state;
                const event = {
                    command,
                    payload: outcome.value.payload,
                    result: outcome.value.value,
                    before,
                    after: state,
                };
                for (const listener of [...listeners]) {
                    try {
                        listener(event);
                    } catch (error) {
                        // the change stands and every listener hears it: a listener's own
                        // error is rethrown on its own, never through `run`
                        queueMicrotask(() => {
                            throw error;
                        });
                    }
                }
                // the active breakpoint without a layout: generated right after, as a command of
                // its own (R3), from the one before it when it just became active
                const active = state.breakpoint;
                const switched = before.breakpoint !== active;
                if (!state.layouts[active]) {
                    queue.unshift({
                        command: "layouts.generate",
                        payload: {
                            breakpoint: active,
                            from: switched ? before.breakpoint : undefined,
                        },
                        env: noEnv,
                    });
                }
            }
        } finally {
            running = false;
            // what was queued runs even when a listener threw
            const pending = queue.shift();
            if (pending) commit(pending.command, pending.payload, pending.env);
        }
        return outcome.ok ? { ok: true, value: outcome.value.value } : outcome;
    }

    function dryRun(
        command: CommandName,
        payload: unknown,
        env: ConstraintEnv,
    ): CommandResult<unknown> {
        const outcome = execute(command, payload, env, true);
        return outcome.ok ? { ok: true, value: outcome.value.value } : outcome;
    }

    const itemOf = (itemId: string) =>
        activeLayout(state).find((item) => item.id === itemId);

    const queries: {
        [K in QueryKey]: (
            payload: QueryMap[K]["payload"],
        ) => QueryMap[K]["result"];
    } = {
        layout: () => activeLayout(state),
        "item-by": ({ itemId }) => itemOf(itemId),
        bottom: () => bottomOf(activeLayout(state)),
        "collisions-by": ({ itemId }) => {
            const item = itemOf(itemId);
            return item ? collisions(activeLayout(state), item) : [];
        },
        rules: () => rulesOf(state),
        breakpoint: () => state.breakpoint,
        layouts: () => state.layouts,
        "layout-by": ({ breakpoint }) => state.layouts[breakpoint],
        cols: () => state.cols,
        "cols-by": ({ breakpoint }) => state.columns[breakpoint],
        breakpoints: () => state.breakpoints,
        "breakpoint-for": ({ width }) =>
            breakpointFor(state.breakpoints, width) ?? state.breakpoint,
    };

    const questions: {
        [K in QuestionKey]: (payload: QuestionMap[K]) => boolean;
    } = {
        "item-static-by": ({ itemId }) => itemOf(itemId)?.static === true,
        "item-draggable-by": ({ itemId }) => {
            const item = itemOf(itemId);
            return (
                item !== undefined &&
                item.static !== true &&
                item.draggable !== false
            );
        },
        "item-resizable-by": ({ itemId }) => {
            const item = itemOf(itemId);
            return (
                item !== undefined &&
                item.static !== true &&
                item.resizable !== false
            );
        },
    };

    return {
        get state() {
            return state;
        },
        run(command, ...[payload, options]) {
            return commit(
                command,
                payload,
                options?.env ?? noEnv,
            ) as CommandResult<never>;
        },
        can(command, ...[payload, options]) {
            return dryRun(command, payload, options?.env ?? noEnv).ok;
        },
        check(command, ...[payload, options]) {
            return dryRun(
                command,
                payload,
                options?.env ?? noEnv,
            ) as CommandResult<never>;
        },
        get(key, ...[payload]) {
            const query = queries[key] as (
                payload: unknown,
            ) => QueryMap[typeof key]["result"];
            return query(payload);
        },
        is(key, payload) {
            const question = questions[key] as (payload: unknown) => boolean;
            return question(payload);
        },
        use(middleware) {
            middlewares.push(middleware);
            return () => {
                const index = middlewares.indexOf(middleware);
                if (index >= 0) middlewares.splice(index, 1);
            };
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
