// The model: the grid's source of truth (D3). Commands run through the middleware chain to their
// handler, which returns a new state or why it refuses; a committed change is told to the
// listeners once. Every committed layout is valid: in bounds, settled, and never overlapping
// unless `allowOverlap`.

import { bottom as bottomOf, collides, collisions } from "../layout/collision";
import { verticalCompactor } from "../layout/compact";
import { addItem, moveItem, removeItem, resizeItem } from "../layout/edit";
import { layoutProblems, normaliseLayout } from "../layout/normalise";
import { resizeRect } from "../layout/resize";
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
    };
}

/** `state` with the active layout replaced (the same state when it is the same layout). */
function withLayout(state: GridLayoutState, layout: Layout): GridLayoutState {
    if (layout === activeLayout(state)) return state;
    return Object.freeze({
        ...state,
        layouts: Object.freeze({
            ...state.layouts,
            [state.breakpoint]: layout,
        }),
    });
}

function done<R>(state: GridLayoutState, value: R): Applied<R> {
    return { ok: true, value: { state, value } };
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
    return result.layout;
}

/** The item `itemId` of the active layout, or the `not_found` failure. */
function found(
    state: GridLayoutState,
    itemId: unknown,
): LayoutItem | CommandFailure {
    need(typeof itemId === "string", "itemId must be a string");
    const item = activeLayout(state).find((entry) => entry.id === itemId);
    return item ?? fail("not_found", `no item "${itemId}"`);
}

const isFailure = (
    value: LayoutItem | CommandFailure,
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
] as const satisfies readonly (keyof ItemSettings)[];

/** Throws a {@link PayloadError} when `settings` is not what `grid.configure` takes. */
function checkGridSettings(settings: GridSettings): void {
    need(
        typeof settings === "object" && settings !== null,
        "settings must be an object",
    );
    const { cols, maxRows, compactor, preventCollision, allowOverlap } =
        settings;
    need(
        cols === undefined || (isInteger(cols) && cols >= 1),
        "cols must be an integer of at least 1",
    );
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

type Handlers = {
    [C in CommandName]: (
        state: GridLayoutState,
        payload: CommandMap[C]["payload"],
    ) => Applied<CommandMap[C]["result"]>;
};

const handlers: Handlers = {
    "layout.set": (state, { layout }) => {
        const next = normalised(layout, rulesOf(state));
        return done(withLayout(state, next), { layout: next });
    },

    "item.add": (state, { item }) => {
        need(
            typeof item === "object" && item !== null,
            "item must be an object",
        );
        const layout = activeLayout(state);
        need(
            !layout.some((entry) => entry.id === item.id),
            `id "${String(item.id)}" is already used`,
        );
        const problems = layoutProblems([
            { ...item, x: item.x ?? 0, y: item.y ?? 0 },
        ]);
        need(problems.length === 0, problems.map((p) => p.message).join("; "));
        // the size within the item's own limits and the columns
        const w = Math.min(
            Math.max(
                Math.min(item.w, item.maxW ?? Number.POSITIVE_INFINITY),
                item.minW ?? 1,
            ),
            state.cols,
        );
        const h = Math.max(
            Math.min(item.h, item.maxH ?? Number.POSITIVE_INFINITY),
            item.minH ?? 1,
        );
        // `y: Infinity` means below everything, as in a layout
        const y =
            item.y === Number.POSITIVE_INFINITY ? bottomOf(layout) : item.y;
        const next = addItem(layout, { ...item, y, w, h }, rulesOf(state));
        return done(withLayout(state, next), { item: itemIn(next, item.id) });
    },

    "item.remove": (state, { itemId }) => {
        const item = found(state, itemId);
        if (isFailure(item)) return item;
        const next = removeItem(activeLayout(state), item.id, rulesOf(state));
        return done(withLayout(state, next), { itemId: item.id });
    },

    "item.move": (state, { itemId, x, y }) => {
        need(isInteger(x) && isInteger(y), "x and y must be integers");
        const item = found(state, itemId);
        if (isFailure(item)) return item;
        if (item.static) return fail("refused", `item "${item.id}" is static`);
        need(
            x >= 0 &&
                y >= 0 &&
                x + item.w <= state.cols &&
                y + item.h <= state.maxRows,
            `the cell ${x},${y} puts item "${item.id}" outside the grid`,
        );
        const layout = activeLayout(state);
        if (state.preventCollision && !state.allowOverlap) {
            const target = { ...item, x, y };
            const hit = layout.find((other) => collides(other, target));
            if (hit) {
                return fail(
                    "collision",
                    `item "${item.id}" would land on "${hit.id}"`,
                );
            }
        }
        const next = moveItem(layout, item.id, x, y, rulesOf(state));
        return done(withLayout(state, next), { item: itemIn(next, item.id) });
    },

    "item.resize": (state, { itemId, w, h, side = "bottom-end" }) => {
        need(isInteger(w) && isInteger(h), "w and h must be integers");
        need(
            RESIZE_SIDES.includes(side as ResizeSide),
            `no resize side "${String(side)}"`,
        );
        const item = found(state, itemId);
        if (isFailure(item)) return item;
        if (item.static) return fail("refused", `item "${item.id}" is static`);
        const layout = activeLayout(state);
        if (state.preventCollision && !state.allowOverlap) {
            const rect = resizeRect(item, side, { w, h }, rulesOf(state));
            const target = { ...item, ...rect };
            const hit = layout.find((other) => collides(other, target));
            if (hit) {
                return fail(
                    "collision",
                    `item "${item.id}" would grow into "${hit.id}"`,
                );
            }
        }
        const next = resizeItem(
            layout,
            item.id,
            { w, h },
            side,
            rulesOf(state),
        );
        return done(withLayout(state, next), { item: itemIn(next, item.id) });
    },

    "item.configure": (state, { itemId, settings }) => {
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
        const item = found(state, itemId);
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
            return done(state, { item });
        }
        const layout = activeLayout(state);
        const changed = layout.map((entry) =>
            entry === item ? { ...entry, ...picked } : entry,
        );
        const next = normalised(changed, rulesOf(state));
        return done(withLayout(state, next), { item: itemIn(next, item.id) });
    },

    "grid.configure": (state, { settings }) => {
        checkGridSettings(settings);
        const { cols, maxRows, compactor, preventCollision, allowOverlap } =
            settings;
        const configured: GridLayoutState = {
            ...state,
            cols: cols ?? state.cols,
            maxRows: maxRows ?? state.maxRows,
            compactor: compactor ?? state.compactor,
            preventCollision: preventCollision ?? state.preventCollision,
            allowOverlap: allowOverlap ?? state.allowOverlap,
        };
        const rules = rulesOf(configured);
        const layouts = Object.fromEntries(
            Object.entries(state.layouts).map(([breakpoint, layout]) => [
                breakpoint,
                normalised(layout, rules),
            ]),
        );
        const same =
            configured.cols === state.cols &&
            configured.maxRows === state.maxRows &&
            configured.compactor === state.compactor &&
            configured.preventCollision === state.preventCollision &&
            configured.allowOverlap === state.allowOverlap &&
            Object.entries(layouts).every(
                ([key, layout]) => layout === state.layouts[key],
            );
        return done(
            same
                ? state
                : Object.freeze({
                      ...configured,
                      layouts: Object.freeze(layouts),
                  }),
            { rules },
        );
    },
};

/** The commands' names, for tools and guards (the naming test checks it lists every one). */
export const COMMANDS = [
    "layout.set",
    "item.add",
    "item.remove",
    "item.move",
    "item.resize",
    "item.configure",
    "grid.configure",
] as const satisfies readonly CommandName[];

/** A grid layout's model, from its options (an invalid initial layout throws a `TypeError`). */
export function createGridLayoutModel(
    options: GridLayoutModelOptions = {},
): GridLayoutModel {
    try {
        checkGridSettings(options);
    } catch (error) {
        throw new TypeError(
            `invalid options: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
    const blank: GridLayoutState = {
        cols: options.cols ?? 12,
        maxRows: options.maxRows ?? Number.POSITIVE_INFINITY,
        compactor: options.compactor ?? verticalCompactor,
        preventCollision: options.preventCollision === true,
        allowOverlap: options.allowOverlap === true,
        breakpoint: DEFAULT_BREAKPOINT,
        layouts: {},
    };
    const first = normaliseLayout(options.layout ?? [], rulesOf(blank));
    if (!first.ok) {
        throw new TypeError(
            `invalid layout: ${first.problems.map((problem) => problem.message).join("; ")}`,
        );
    }
    let state: GridLayoutState = Object.freeze({
        ...blank,
        layouts: Object.freeze({ [DEFAULT_BREAKPOINT]: first.layout }),
    });
    const middlewares: Middleware[] = [];
    const listeners = new Set<CommandListener>();
    const queue: { command: CommandName; payload: unknown }[] = [];
    let running = false;

    /** The chain, then the handler; returns the new state (uncommitted), value and payload. */
    function execute(
        command: CommandName,
        payload: unknown,
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
        } as CommandContext;
        let applied: Applied<unknown> | undefined;
        const step = (index: number): CommandResult<unknown> => {
            const middleware = middlewares[index];
            if (!middleware) {
                const handler = handlers[ctx.command] as (
                    state: GridLayoutState,
                    payload: unknown,
                ) => Applied<unknown>;
                try {
                    applied = handler(state, ctx.payload);
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
    ): CommandResult<unknown> {
        if (running) {
            queue.push({ command, payload });
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
            outcome = execute(command, payload, false);
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
            }
        } finally {
            running = false;
            // what was queued runs even when a listener threw
            const pending = queue.shift();
            if (pending) commit(pending.command, pending.payload);
        }
        return outcome.ok ? { ok: true, value: outcome.value.value } : outcome;
    }

    function dryRun(
        command: CommandName,
        payload: unknown,
    ): CommandResult<unknown> {
        const outcome = execute(command, payload, true);
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
        run(command, ...[payload]) {
            return commit(command, payload) as CommandResult<never>;
        },
        can(command, ...[payload]) {
            return dryRun(command, payload).ok;
        },
        check(command, ...[payload]) {
            return dryRun(command, payload) as CommandResult<never>;
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
