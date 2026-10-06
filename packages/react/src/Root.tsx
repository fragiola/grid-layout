// The root: one grid layout. It creates the model and the engine once, renders the view, maps the
// declarative props onto commands (D3) and tells the app what changed (D9).

import {
    type Breakpoints,
    breakpointFor,
    type Compactor,
    type ConstraintRegistry,
    createGridLayoutEngine,
    createGridLayoutModel,
    DEFAULT_BREAKPOINT,
    type Direction,
    defaultConstraints,
    type ExternalDragAnswer,
    type GestureEvent,
    type GridLayoutEngine,
    type GridLayoutEngineOptions,
    type GridLayoutModel,
    type Layout,
    type LayoutConstraint,
    type LayoutItem,
    normaliseLayout,
    type PerBreakpoint,
    type RootState,
    rootPart,
    verticalCompactor,
} from "@fragiola/grid-layout";
import type * as React from "react";
import {
    type ReactNode,
    useCallback,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { GridLayoutContext, ViewContext } from "./context";
import { attachGridLayoutRef, type GridLayoutRef } from "./gridLayoutRef";
import { type DropDetails, dropDetailsOf } from "./hooks";
import { type DivPrimitiveProps, useRenderElement } from "./utils/useRender";

export type { RootState };

/** A gesture's step, as the `onDrag*` and `onResize*` callbacks receive it. */
export type GestureCallback = (event: GestureEvent) => void;

export type RootProps = Omit<DivPrimitiveProps<RootState>, "onDrop"> & {
    /** the items (the active breakpoint's), controlled; pair it with `onLayoutChange` */
    layout?: Layout | undefined;
    /** the items to start with, uncontrolled */
    defaultLayout?: Layout | undefined;
    /**
     * each breakpoint's items, controlled; a breakpoint it leaves out is generated when first
     * active (R3). Pair it with `onLayoutChange`
     */
    layouts?: Readonly<Record<string, Layout>> | undefined;
    /** each breakpoint's items to start with, uncontrolled */
    defaultLayouts?: Readonly<Record<string, Layout>> | undefined;
    /**
     * the layout changed (or, controlled, asks to): once per committed change, never during a
     * gesture, on mount only when the given layout had to be corrected (or one was generated),
     * and when the breakpoint changes. With every breakpoint's layouts
     */
    onLayoutChange?:
        | ((layout: Layout, layouts: Readonly<Record<string, Layout>>) => void)
        | undefined;
    /**
     * each breakpoint's minimum width, of the grid's own width (R1):
     * `{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }` (default: one breakpoint)
     */
    breakpoints?: Breakpoints | undefined;
    /** the breakpoint, controlled: it overrides the one the grid's width gives */
    breakpoint?: string | undefined;
    /** the breakpoint to start with before the grid is measured (server rendering) */
    defaultBreakpoint?: string | undefined;
    /** the breakpoint changed: once per change, with its columns */
    onBreakpointChange?:
        | ((breakpoint: string, cols: number) => void)
        | undefined;
    /** the columns, for every breakpoint or each one (default 12) */
    cols?: number | Readonly<Record<string, number>> | undefined;
    /** the rows a gesture may reach (default: unbounded) */
    maxRows?: number | undefined;
    /** how the layout settles (default: `verticalCompactor`) */
    compactor?: Compactor | undefined;
    /** a move or resize into an occupied cell is refused instead of pushing */
    preventCollision?: boolean | undefined;
    /** items may overlap: nothing is pushed and nothing settles */
    allowOverlap?: boolean | undefined;
    /**
     * what every place and size passes through, by pointer, keyboard, drop or command (default:
     * `gridBounds`, then `minMaxSize`). Keep it stable (module level or `useMemo`): a new list
     * configures the grid again
     */
    constraints?: readonly LayoutConstraint[] | undefined;
    /**
     * the constraints items name in their own `constraints`, by name (`{ aspectRatio, boundedX }`):
     * read when the grid is created
     */
    constraintRegistry?: ConstraintRegistry | undefined;
    /** one row's height in pixels, for every breakpoint or each one (default 150) */
    rowHeight?: PerBreakpoint<number> | undefined;
    /**
     * the space between items, `[inline, block]` in pixels, for every breakpoint or each one
     * (default `[10, 10]`)
     */
    gap?: PerBreakpoint<readonly [number, number]> | undefined;
    /** the space between the root's edge and the items (default: `gap`) */
    padding?: PerBreakpoint<readonly [number, number]> | undefined;
    /** the root's height follows the layout (default true) */
    autoSize?: boolean | undefined;
    /** a fixed width in pixels (server rendering); without it the root is measured */
    width?: number | undefined;
    /** whether people may drag items (default true) */
    draggable?: boolean | undefined;
    /** whether people may resize items (default true) */
    resizable?: boolean | undefined;
    /** a dragged item stays inside the root */
    bounded?: boolean | undefined;
    /** how far a press moves before it is a drag, in pixels (default 3) */
    threshold?: number | undefined;
    /**
     * how long a touch on an item's body is held before it drags, in milliseconds (default 250):
     * a touch that moves sooner scrolls the page; handles and drag sources start at once
     */
    touchDelay?: number | undefined;
    /** how far a held touch may move and still drag, in pixels (default 5) */
    touchTolerance?: number | undefined;
    /** near the scroll container's edges, a gesture scrolls it (default on); `false`: never */
    autoScroll?: GridLayoutEngineOptions["autoScroll"];
    /** the writing direction (default: the root's computed `direction`); set as `dir` too */
    dir?: Direction | undefined;
    /**
     * the scale a CSS transform on an ancestor draws the grid at (default: read from the root's
     * box on screen, so a scaled grid needs none)
     */
    scale?: number | undefined;
    onDragStart?: GestureCallback | undefined;
    onDrag?: GestureCallback | undefined;
    onDragStop?: GestureCallback | undefined;
    onResizeStart?: GestureCallback | undefined;
    onResize?: GestureCallback | undefined;
    onResizeStop?: GestureCallback | undefined;
    /**
     * the grid, reachable from outside the root: its `current` is `{ model, engine }` while this
     * root is mounted (from `useGridLayoutRef()` or `createGridLayoutRef()`)
     */
    gridLayoutRef?: GridLayoutRef | undefined;
    /**
     * a native drag over the root (files, links, text from another window): the item to drop,
     * `false` to refuse it, `undefined` to ignore it. Asked again on the drop, when the files can
     * be read: that answer can refuse, and gives the drop's data
     */
    onExternalDrag?: ((event: DragEvent) => ExternalDragAnswer) | undefined;
    /** an item from outside was added (by a drag source or a native drag) */
    onDrop?: ((drop: DropDetails) => void) | undefined;
    /** a new id for an item dropped without one (default: a random UUID) */
    createId?: (() => string) | undefined;
    children?: ReactNode;
};

const ITEM_KEYS = [
    "id",
    "x",
    "y",
    "w",
    "h",
    "minW",
    "maxW",
    "minH",
    "maxH",
    "static",
    "draggable",
    "resizable",
    "constraints",
] as const satisfies readonly (keyof LayoutItem)[];

/** Whether two items' stored constraints say the same: by name and arguments. */
function sameConstraints(
    a: LayoutItem["constraints"],
    b: LayoutItem["constraints"],
): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((one, index) => {
        const other = b[index];
        if (typeof one === "string" || typeof other === "string")
            return one === other;
        return (
            other !== undefined &&
            one.name === other.name &&
            (one.args ?? []).length === (other.args ?? []).length &&
            (one.args ?? []).every((arg, at) => arg === other.args?.[at])
        );
    });
}

/** The rules' default breakpoints: one, at every width. */
const ONE_BREAKPOINT = { [DEFAULT_BREAKPOINT]: 0 };

/**
 * `value`, the same object as long as its content is: a number, or a map of numbers compared key
 * by key (a prop written inline is a new object each render).
 */
function useStable<T extends number | Readonly<Record<string, number>>>(
    value: T,
): T {
    const kept = useRef(value);
    const same = (a: T, b: T) =>
        a === b ||
        (typeof a === "object" &&
            typeof b === "object" &&
            Object.keys(a).length === Object.keys(b).length &&
            Object.entries(a).every(([key, each]) => b[key] === each));
    if (!same(kept.current, value)) kept.current = value;
    return kept.current;
}

/** Whether two layouts hold the same items, field by field, in the same order. */
export function sameLayout(a: Layout, b: Layout): boolean {
    return (
        a === b ||
        (a.length === b.length &&
            a.every((item, index) => {
                const other = b[index];
                return (
                    other !== undefined &&
                    ITEM_KEYS.every((key) =>
                        key === "constraints"
                            ? sameConstraints(item[key], other[key])
                            : item[key] === other[key],
                    )
                );
            }))
    );
}

const CALLBACKS: Record<string, keyof RootProps> = {
    "drag-start": "onDragStart",
    drag: "onDrag",
    "drag-stop": "onDragStop",
    "resize-start": "onResizeStart",
    resize: "onResize",
    "resize-stop": "onResizeStop",
};

/** The grid layout: a positioned box its items are placed in, as tall as the layout. */
export function Root(props: RootProps) {
    const {
        layout,
        defaultLayout,
        layouts,
        defaultLayouts,
        onLayoutChange,
        breakpoints,
        breakpoint,
        defaultBreakpoint,
        onBreakpointChange: _onBreakpointChange,
        cols,
        maxRows,
        compactor,
        preventCollision,
        allowOverlap,
        constraints,
        constraintRegistry,
        rowHeight,
        gap,
        padding,
        autoSize,
        width,
        draggable,
        resizable,
        bounded,
        threshold,
        touchDelay,
        touchTolerance,
        autoScroll,
        dir,
        scale,
        onDragStart: _onDragStart,
        onDrag: _onDrag,
        onDragStop: _onDragStop,
        onResizeStart: _onResizeStart,
        onResize: _onResize,
        onResizeStop: _onResizeStop,
        gridLayoutRef,
        onExternalDrag,
        onDrop: _onDrop,
        createId,
        children,
        ...rest
    } = props;
    const latest = useRef(props);
    latest.current = props;

    const [{ model, engine, given }] = useState(() => {
        const start = layout ?? defaultLayout;
        const startAll = layouts ?? defaultLayouts;
        const created: GridLayoutModel = createGridLayoutModel({
            layout: start,
            layouts: startAll,
            breakpoints,
            breakpoint: breakpoint ?? defaultBreakpoint,
            cols,
            maxRows,
            compactor,
            preventCollision,
            allowOverlap,
            constraints,
            constraintRegistry,
        });
        // the breakpoint the grid starts at, before the engine measures (or is told) another
        const initial = created.state.breakpoint;
        const bound: GridLayoutEngine = createGridLayoutEngine(created, {
            rowHeight,
            gap,
            padding,
            autoSize,
            width,
            draggable,
            resizable,
            bounded,
            threshold,
            touchDelay,
            touchTolerance,
            autoScroll,
            breakpoint,
            dir,
            scale,
        });
        return {
            model: created,
            engine: bound,
            given: {
                layout: start ?? (startAll ? undefined : []),
                layouts: startAll,
                breakpoint: initial,
            },
        };
    });

    // the engine's options after each render: setting them may tell a new view, which must not
    // happen while React renders
    useLayoutEffect(() => {
        engine.adapter.setOptions({
            rowHeight,
            gap,
            padding,
            autoSize,
            width,
            draggable,
            resizable,
            bounded,
            threshold,
            touchDelay,
            touchTolerance,
            autoScroll,
            breakpoint,
            dir,
            scale,
            onExternalDrag,
            createId,
        });
    });

    const view = useSyncExternalStore(
        engine.adapter.subscribe,
        engine.adapter.getView,
        engine.adapter.getView,
    );

    const context = useMemo(() => ({ model, engine }), [model, engine]);
    // outside the root, the grid is reachable once it is mounted (X5), first: the callbacks the
    // effects below may call find it
    useLayoutEffect(
        () =>
            gridLayoutRef
                ? attachGridLayoutRef(gridLayoutRef, context)
                : undefined,
        [gridLayoutRef, context],
    );

    // controlled: a change the parent does not take is undone at its next render, which this
    // forces (a parent that ignores onLayoutChange may not render again)
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    /** the prop is being applied: its commit is not a change of the user's to tell */
    const syncing = useRef(false);

    useLayoutEffect(() => {
        const tell = () =>
            latest.current.onLayoutChange?.(
                model.get("layout"),
                model.get("layouts"),
            );
        const unsubscribe = model.subscribe((event) => {
            const { before, after } = event;
            const switched = before.breakpoint !== after.breakpoint;
            if (switched)
                latest.current.onBreakpointChange?.(
                    after.breakpoint,
                    after.cols,
                );
            if (syncing.current) return;
            if (before.layouts === after.layouts && !switched) return;
            // a breakpoint without a layout yet: generated right after, and told then
            if (!after.layouts[after.breakpoint]) return;
            tell();
            if (
                latest.current.layout !== undefined ||
                latest.current.layouts !== undefined
            ) {
                rerender();
            }
        });
        // the breakpoint the grid measured (or was told) before this listened: told on mount
        const now = model.get("breakpoint");
        const moved = now !== given.breakpoint;
        if (moved) latest.current.onBreakpointChange?.(now, model.get("cols"));
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
    }, [model, given]);

    useLayoutEffect(
        () =>
            engine.subscribe((event) => {
                if (event.type === "drop" && event.external) {
                    latest.current.onDrop?.(dropDetailsOf(event));
                    return;
                }
                const name = CALLBACKS[event.type];
                const callback = name ? latest.current[name] : undefined;
                if (typeof callback === "function")
                    (callback as GestureCallback)(event);
            }),
        [engine],
    );

    // the rules, each at its default when the prop is absent: a change re-settles every layout
    // (and is told, as any committed change). Maps compare by content: written inline, a new
    // object each render, they configure nothing again
    const stableBreakpoints = useStable(breakpoints ?? ONE_BREAKPOINT);
    const stableCols = useStable(cols ?? 12);
    useLayoutEffect(() => {
        // when the breakpoints drop the active one: the one the grid's width gives, in one step
        const width = engine.get("geometry")?.width ?? 0;
        const result = model.run("grid.configure", {
            settings: {
                breakpoints: stableBreakpoints,
                breakpoint: breakpointFor(stableBreakpoints, width),
                cols: stableCols,
                maxRows: maxRows ?? Number.POSITIVE_INFINITY,
                compactor: compactor ?? verticalCompactor,
                preventCollision: preventCollision ?? false,
                allowOverlap: allowOverlap ?? false,
                constraints: constraints ?? defaultConstraints,
            },
        });
        // the same error a mount with these props throws: rules that cannot be used
        if (!result.ok) {
            throw new TypeError(`invalid options: ${result.error.message}`);
        }
    }, [
        model,
        engine,
        stableBreakpoints,
        stableCols,
        maxRows,
        compactor,
        preventCollision,
        allowOverlap,
        constraints,
    ]);

    // the controlled layouts: the breakpoints the prop names hold what it says, settled in their
    // columns; the ones it leaves out keep what the model generated (no loop with a parent that
    // keeps an incomplete map)
    const checkedAll = useRef<{
        prop: Readonly<Record<string, Layout>>;
        model: Readonly<Record<string, Layout>>;
    } | null>(null);
    useLayoutEffect(() => {
        if (layouts === undefined) return;
        const current = model.get("layouts");
        const last = checkedAll.current;
        if (last && last.prop === layouts && last.model === current) return;
        const rules = model.get("rules");
        const differs = Object.entries(layouts).some(([name, given]) => {
            const cols = model.get("cols-by", { breakpoint: name });
            if (cols === undefined) return true;
            const settled = normaliseLayout(given, { ...rules, cols });
            return (
                !settled.ok || !sameLayout(settled.layout, current[name] ?? [])
            );
        });
        if (!differs) {
            checkedAll.current = { prop: layouts, model: current };
            return;
        }
        syncing.current = true;
        let result: ReturnType<typeof model.run<"layouts.set">>;
        try {
            result = model.run("layouts.set", {
                layouts: { ...current, ...layouts },
            });
        } finally {
            syncing.current = false;
        }
        // the same error a mount with these layouts throws: layouts that cannot be used
        if (!result.ok) {
            throw new TypeError(`invalid layouts: ${result.error.message}`);
        }
        const next = model.get("layouts");
        checkedAll.current = { prop: layouts, model: next };
        // the parent's layouts had to be corrected (or a layout was generated): told once
        if (
            result.ok &&
            Object.entries(next).some(
                ([name, settled]) =>
                    layouts[name] === undefined ||
                    !sameLayout(layouts[name], settled),
            )
        ) {
            latest.current.onLayoutChange?.(model.get("layout"), next);
        }
    });

    // the controlled layout: the model holds the prop as it settles under the rules. A prop that
    // has to be corrected is applied once and told once; it is not applied again while it stays
    // the same (no loop with a parent that keeps it)
    const checked = useRef<{
        prop: Layout;
        model: Layout;
        breakpoint: string;
    } | null>(null);
    useLayoutEffect(() => {
        if (layout === undefined) return;
        const current = model.get("layout");
        const now = model.get("breakpoint");
        const last = checked.current;
        if (last && last.prop === layout && last.model === current) return;
        // the breakpoint changed under the same prop: it is the breakpoint before's layout, and
        // the parent was told the new one; it is not applied to the new breakpoint
        const seen = last ?? {
            prop: given.layout,
            breakpoint: given.breakpoint,
        };
        if (seen.prop === layout && seen.breakpoint !== now) {
            checked.current = { prop: layout, model: current, breakpoint: now };
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
            checked.current = { prop: layout, model: current, breakpoint: now };
            // a new prop the grid shows corrected is told, even when the grid did not change
            // (on mount, the mount check tells it)
            if (fresh && !sameLayout(settled.layout, layout)) {
                latest.current.onLayoutChange?.(current, model.get("layouts"));
            }
            return;
        }
        syncing.current = true;
        let result: ReturnType<typeof model.run<"layout.set">>;
        try {
            result = model.run("layout.set", { layout });
        } finally {
            syncing.current = false;
        }
        checked.current = {
            prop: layout,
            model: model.get("layout"),
            breakpoint: now,
        };
        if (result.ok && !sameLayout(result.value.layout, layout)) {
            // the parent's layout had to be corrected: it is told what holds, once
            latest.current.onLayoutChange?.(
                result.value.layout,
                model.get("layouts"),
            );
        }
    });

    const attach = useCallback(
        (element: HTMLElement | null) => {
            if (element) return engine.adapter.attach(element);
        },
        [engine],
    );

    const part = rootPart(view);
    const element = useRenderElement("div", rest, {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style,
            ...(dir ? { dir } : {}),
        },
        children,
        ref: attach,
        // the engine's after the app's own handlers: `preventDefault` vetoes a gesture or a key
        after: {
            onPointerDown: (event: React.PointerEvent) =>
                engine.adapter.pointerdown(event.nativeEvent),
            onKeyDown: (event: React.KeyboardEvent) =>
                engine.adapter.keydown(event.nativeEvent),
            onDragEnter: (event: React.DragEvent) =>
                engine.adapter.dragenter(event.nativeEvent),
            onDragOver: (event: React.DragEvent) =>
                engine.adapter.dragover(event.nativeEvent),
            onDragLeave: (event: React.DragEvent) =>
                engine.adapter.dragleave(event.nativeEvent),
            onDrop: (event: React.DragEvent) =>
                engine.adapter.drop(event.nativeEvent),
        },
    });
    return (
        <GridLayoutContext.Provider value={context}>
            <ViewContext.Provider value={view}>{element}</ViewContext.Provider>
        </GridLayoutContext.Provider>
    );
}
