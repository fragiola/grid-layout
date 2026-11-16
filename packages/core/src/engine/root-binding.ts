// What a `GridLayout.Root` decides, in every adapter: the model and the engine it creates from its
// declarative props, how those props map onto commands (D3: the rules, the controlled layouts and
// layout), and what it tells the app (D9: `onLayoutChange` once per committed change, the
// breakpoint, the gestures, the drops). An adapter keeps the latest props readable through `read`
// and calls each step where its framework runs code after a render; it decides nothing.

import { verticalCompactor } from "../layout/compact";
import {
    type ConstraintRegistry,
    defaultConstraints,
    type LayoutConstraint,
} from "../layout/constraints";
import { normaliseLayout } from "../layout/normalise";
import { type Breakpoints, breakpointFor } from "../layout/responsive";
import { sameLayout } from "../layout/same-layout";
import type { Compactor, Layout } from "../layout/types";
import { createGridLayoutModel } from "../model/model";
import { DEFAULT_BREAKPOINT, type GridLayoutModel } from "../model/types";
import { type DropDetails, dropDetailsOf } from "./drop-details";
import { createGridLayoutEngine } from "./engine";
import type {
    Direction,
    ExternalDragAnswer,
    GestureEvent,
    GridLayoutEngine,
    GridLayoutEngineOptions,
    PerBreakpoint,
} from "./types";

/** A gesture's step, as the `onDrag*` and `onResize*` callbacks receive it. */
export type GestureCallback = (event: GestureEvent) => void;

/** A root's declarative props, as every adapter takes them (each framework names its own events). */
export interface GridLayoutRootOptions {
    layout?: Layout | undefined;
    defaultLayout?: Layout | undefined;
    layouts?: Readonly<Record<string, Layout>> | undefined;
    defaultLayouts?: Readonly<Record<string, Layout>> | undefined;
    onLayoutChange?:
        | ((layout: Layout, layouts: Readonly<Record<string, Layout>>) => void)
        | undefined;
    breakpoints?: Breakpoints | undefined;
    breakpoint?: string | undefined;
    defaultBreakpoint?: string | undefined;
    onBreakpointChange?:
        | ((breakpoint: string, cols: number) => void)
        | undefined;
    cols?: number | Readonly<Record<string, number>> | undefined;
    maxRows?: number | undefined;
    compactor?: Compactor | undefined;
    preventCollision?: boolean | undefined;
    allowOverlap?: boolean | undefined;
    constraints?: readonly LayoutConstraint[] | undefined;
    constraintRegistry?: ConstraintRegistry | undefined;
    rowHeight?: PerBreakpoint<number> | undefined;
    gap?: PerBreakpoint<readonly [number, number]> | undefined;
    padding?: PerBreakpoint<readonly [number, number]> | undefined;
    autoSize?: boolean | undefined;
    width?: number | undefined;
    draggable?: boolean | undefined;
    resizable?: boolean | undefined;
    bounded?: boolean | undefined;
    threshold?: number | undefined;
    touchDelay?: number | undefined;
    touchTolerance?: number | undefined;
    autoScroll?: GridLayoutEngineOptions["autoScroll"];
    dir?: Direction | undefined;
    scale?: number | undefined;
    onDragStart?: GestureCallback | undefined;
    onDrag?: GestureCallback | undefined;
    onDragStop?: GestureCallback | undefined;
    onResizeStart?: GestureCallback | undefined;
    onResize?: GestureCallback | undefined;
    onResizeStop?: GestureCallback | undefined;
    onExternalDrag?: ((event: DragEvent) => ExternalDragAnswer) | undefined;
    onDrop?: ((drop: DropDetails) => void) | undefined;
    createId?: (() => string) | undefined;
}

/** Adapter-only (an app never calls it): what a root does with its props, step by step. */
export interface GridLayoutRootBinding {
    readonly model: GridLayoutModel;
    readonly engine: GridLayoutEngine;
    /** after each render: the engine's options (setting them may tell a new view) */
    setOptions(): void;
    /**
     * once mounted: tells the app the layout changes and the breakpoint, and, on mount, a layout
     * that had to be corrected (or was generated). `rerender` is called after a change a
     * controlled root must undo when its parent does not take it. Returns the remover
     */
    listenModel(rerender: () => void): () => void;
    /** once mounted: tells the app the gestures and the drops; returns the remover */
    listenEngine(): () => void;
    /** after each render: the rules, run again only when one of them changed */
    configure(): void;
    /** after each render: the controlled `layouts` */
    syncLayouts(): void;
    /** after each render: the controlled `layout` */
    syncLayout(): void;
}

/** The rules' default breakpoints: one, at every width. */
const ONE_BREAKPOINT = { [DEFAULT_BREAKPOINT]: 0 };

/** The callback each gesture event is told through. */
const CALLBACKS: Record<string, keyof GridLayoutRootOptions> = {
    "drag-start": "onDragStart",
    drag: "onDrag",
    "drag-stop": "onDragStop",
    "resize-start": "onResizeStart",
    resize: "onResize",
    "resize-stop": "onResizeStop",
};

/** A number, or a map of numbers compared key by key: a prop written inline is a new object. */
function sameValue(
    a: number | Readonly<Record<string, number>>,
    b: number | Readonly<Record<string, number>>,
): boolean {
    return (
        a === b ||
        (typeof a === "object" &&
            typeof b === "object" &&
            Object.keys(a).length === Object.keys(b).length &&
            Object.entries(a).every(([key, each]) => b[key] === each))
    );
}

/** The rules a root's props set, each at its default when the prop is absent. */
interface Rules {
    readonly breakpoints: Breakpoints;
    readonly cols: number | Readonly<Record<string, number>>;
    readonly maxRows: number | undefined;
    readonly compactor: Compactor | undefined;
    readonly preventCollision: boolean | undefined;
    readonly allowOverlap: boolean | undefined;
    readonly constraints: readonly LayoutConstraint[] | undefined;
}

function sameRules(a: Rules, b: Rules): boolean {
    return (
        sameValue(a.breakpoints, b.breakpoints) &&
        sameValue(a.cols, b.cols) &&
        a.maxRows === b.maxRows &&
        a.compactor === b.compactor &&
        a.preventCollision === b.preventCollision &&
        a.allowOverlap === b.allowOverlap &&
        a.constraints === b.constraints
    );
}

/** The engine's options a root's props set. */
function engineOptionsOf(
    props: GridLayoutRootOptions,
): GridLayoutEngineOptions {
    return {
        rowHeight: props.rowHeight,
        gap: props.gap,
        padding: props.padding,
        autoSize: props.autoSize,
        width: props.width,
        draggable: props.draggable,
        resizable: props.resizable,
        bounded: props.bounded,
        threshold: props.threshold,
        touchDelay: props.touchDelay,
        touchTolerance: props.touchTolerance,
        autoScroll: props.autoScroll,
        breakpoint: props.breakpoint,
        dir: props.dir,
        scale: props.scale,
    };
}

/**
 * Adapter-only (an app never calls it): a root's model and engine, made from its first props, and the steps that
 * keep them in line with the props `read` gives on every call.
 */
export function createGridLayoutRootBinding(
    read: () => GridLayoutRootOptions,
): GridLayoutRootBinding {
    const first = read();
    const start = first.layout ?? first.defaultLayout;
    const startAll = first.layouts ?? first.defaultLayouts;
    const model: GridLayoutModel = createGridLayoutModel({
        layout: start,
        layouts: startAll,
        breakpoints: first.breakpoints,
        breakpoint: first.breakpoint ?? first.defaultBreakpoint,
        cols: first.cols,
        maxRows: first.maxRows,
        compactor: first.compactor,
        preventCollision: first.preventCollision,
        allowOverlap: first.allowOverlap,
        constraints: first.constraints,
        constraintRegistry: first.constraintRegistry,
    });
    const given = {
        layout: start ?? (startAll ? undefined : []),
        layouts: startAll,
        // the breakpoint the grid starts at, before the engine measures (or is told) another
        breakpoint: model.state.breakpoint,
    };
    const engine: GridLayoutEngine = createGridLayoutEngine(
        model,
        engineOptionsOf(first),
    );

    /** the prop is being applied: its commit is not a change of the user's to tell */
    let syncing = false;
    let rules: Rules | undefined;
    let checkedAll: {
        prop: Readonly<Record<string, Layout>>;
        model: Readonly<Record<string, Layout>>;
    } | null = null;
    let checked: {
        prop: Layout;
        model: Layout;
        breakpoint: string;
    } | null = null;

    return {
        model,
        engine,

        setOptions() {
            const props = read();
            engine.adapter.setOptions({
                ...engineOptionsOf(props),
                onExternalDrag: props.onExternalDrag,
                createId: props.createId,
            });
        },

        listenModel(rerender) {
            const tell = () =>
                read().onLayoutChange?.(
                    model.get("layout"),
                    model.get("layouts"),
                );
            const unsubscribe = model.subscribe((event) => {
                const { before, after } = event;
                const switched = before.breakpoint !== after.breakpoint;
                if (switched)
                    read().onBreakpointChange?.(after.breakpoint, after.cols);
                if (syncing) return;
                if (before.layouts === after.layouts && !switched) return;
                // a breakpoint without a layout yet: generated right after, and told then
                if (!after.layouts[after.breakpoint]) return;
                tell();
                const props = read();
                // controlled: a change the parent does not take is undone at its next render,
                // which this forces (a parent that ignores the change may not render again)
                if (props.layout !== undefined || props.layouts !== undefined) {
                    rerender();
                }
            });
            // the breakpoint the grid measured (or was told) before this listened: told on mount
            const now = model.get("breakpoint");
            const moved = now !== given.breakpoint;
            if (moved) read().onBreakpointChange?.(now, model.get("cols"));
            // on mount, a layout that had to be corrected (or was generated) is told once (D9)
            const all = model.get("layouts");
            const corrected = given.layouts
                ? Object.entries(all).some(([name, settled]) => {
                      const start = given.layouts?.[name];
                      return start === undefined || !sameLayout(start, settled);
                  })
                : !sameLayout(given.layout ?? [], model.get("layout"));
            // a breakpoint change alone is not a layout change on mount: onBreakpointChange tells it
            if (corrected) tell();
            return unsubscribe;
        },

        listenEngine() {
            return engine.subscribe((event) => {
                const props = read();
                if (event.type === "drop" && event.external) {
                    props.onDrop?.(dropDetailsOf(event));
                    return;
                }
                const name = CALLBACKS[event.type];
                const callback = name ? props[name] : undefined;
                if (typeof callback === "function")
                    (callback as GestureCallback)(event);
            });
        },

        configure() {
            // the rules, each at its default when the prop is absent: a change re-settles every
            // layout (and is told, as any committed change). Maps compare by content: written
            // inline, a new object each render, they configure nothing again
            const props = read();
            const next: Rules = {
                breakpoints: props.breakpoints ?? ONE_BREAKPOINT,
                cols: props.cols ?? 12,
                maxRows: props.maxRows,
                compactor: props.compactor,
                preventCollision: props.preventCollision,
                allowOverlap: props.allowOverlap,
                constraints: props.constraints,
            };
            if (rules && sameRules(rules, next)) return;
            // the first ones kept, as long as their content is: a map compared by content stays
            // the object first seen
            rules = rules
                ? {
                      ...next,
                      breakpoints: sameValue(
                          rules.breakpoints,
                          next.breakpoints,
                      )
                          ? rules.breakpoints
                          : next.breakpoints,
                      cols: sameValue(rules.cols, next.cols)
                          ? rules.cols
                          : next.cols,
                  }
                : next;
            // when the breakpoints drop the active one: the one the grid's width gives, in one step
            const width = engine.get("geometry")?.width ?? 0;
            const result = model.run("grid.configure", {
                settings: {
                    breakpoints: rules.breakpoints,
                    breakpoint: breakpointFor(rules.breakpoints, width),
                    cols: rules.cols,
                    maxRows: rules.maxRows ?? Number.POSITIVE_INFINITY,
                    compactor: rules.compactor ?? verticalCompactor,
                    preventCollision: rules.preventCollision ?? false,
                    allowOverlap: rules.allowOverlap ?? false,
                    constraints: rules.constraints ?? defaultConstraints,
                },
            });
            // the same error a mount with these props throws: rules that cannot be used
            if (!result.ok) {
                throw new TypeError(`invalid options: ${result.error.message}`);
            }
        },

        syncLayouts() {
            // the controlled layouts: the breakpoints the prop names hold what it says, settled in
            // their columns; the ones it leaves out keep what the model generated (no loop with a
            // parent that keeps an incomplete map)
            const { layouts } = read();
            if (layouts === undefined) return;
            const current = model.get("layouts");
            const last = checkedAll;
            if (last && last.prop === layouts && last.model === current) return;
            const settings = model.get("rules");
            const differs = Object.entries(layouts).some(([name, given]) => {
                const cols = model.get("cols-by", { breakpoint: name });
                if (cols === undefined) return true;
                const settled = normaliseLayout(given, { ...settings, cols });
                return (
                    !settled.ok ||
                    !sameLayout(settled.layout, current[name] ?? [])
                );
            });
            if (!differs) {
                checkedAll = { prop: layouts, model: current };
                return;
            }
            syncing = true;
            let result: ReturnType<typeof model.run<"layouts.set">>;
            try {
                result = model.run("layouts.set", {
                    layouts: { ...current, ...layouts },
                });
            } finally {
                syncing = false;
            }
            // the same error a mount with these layouts throws: layouts that cannot be used
            if (!result.ok) {
                throw new TypeError(`invalid layouts: ${result.error.message}`);
            }
            const next = model.get("layouts");
            checkedAll = { prop: layouts, model: next };
            // the parent's layouts had to be corrected (or a layout was generated): told once
            if (
                result.ok &&
                Object.entries(next).some(
                    ([name, settled]) =>
                        layouts[name] === undefined ||
                        !sameLayout(layouts[name], settled),
                )
            ) {
                read().onLayoutChange?.(model.get("layout"), next);
            }
        },

        syncLayout() {
            // the controlled layout: the model holds the prop as it settles under the rules. A prop
            // that has to be corrected is applied once and told once; it is not applied again
            // while it stays the same (no loop with a parent that keeps it)
            const { layout } = read();
            if (layout === undefined) return;
            const current = model.get("layout");
            const now = model.get("breakpoint");
            const last = checked;
            if (last && last.prop === layout && last.model === current) return;
            // the breakpoint changed under the same prop: it is the breakpoint before's layout,
            // and the parent was told the new one; it is not applied to the new breakpoint
            const seen = last ?? {
                prop: given.layout,
                breakpoint: given.breakpoint,
            };
            if (seen.prop === layout && seen.breakpoint !== now) {
                checked = { prop: layout, model: current, breakpoint: now };
                return;
            }
            // a new prop (not the model changing under the same one, as a rule's change does)
            const fresh = last !== null && last.prop !== layout;
            const settled = normaliseLayout(layout, model.get("rules"));
            if (!settled.ok) {
                // the same error a mount with this layout throws: a layout that cannot be used
                throw new TypeError(
                    `invalid layout: ${settled.problems.map((problem) => problem.message).join("; ")}`,
                );
            }
            if (sameLayout(settled.layout, current)) {
                checked = { prop: layout, model: current, breakpoint: now };
                // a new prop the grid shows corrected is told, even when the grid did not change
                // (on mount, the mount check tells it)
                if (fresh && !sameLayout(settled.layout, layout)) {
                    read().onLayoutChange?.(current, model.get("layouts"));
                }
                return;
            }
            syncing = true;
            let result: ReturnType<typeof model.run<"layout.set">>;
            try {
                result = model.run("layout.set", { layout });
            } finally {
                syncing = false;
            }
            checked = {
                prop: layout,
                model: model.get("layout"),
                breakpoint: now,
            };
            if (result.ok && !sameLayout(result.value.layout, layout)) {
                // the parent's layout had to be corrected: it is told what holds, once
                read().onLayoutChange?.(
                    result.value.layout,
                    model.get("layouts"),
                );
            }
        },
    };
}
