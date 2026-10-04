// The root: one grid layout. It creates the model and the engine once, renders the view, maps the
// declarative props onto commands (D3) and tells the app what changed (D9).

import {
    type Compactor,
    createGridLayoutEngine,
    createGridLayoutModel,
    type Direction,
    type GestureEvent,
    type GridLayoutEngine,
    type GridLayoutModel,
    type Layout,
    type LayoutItem,
    normaliseLayout,
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
import { type DivPrimitiveProps, useRenderElement } from "./utils/useRender";

export type { RootState };

/** A gesture's step, as the `onDrag*` and `onResize*` callbacks receive it. */
export type GestureCallback = (event: GestureEvent) => void;

export type RootProps = DivPrimitiveProps<RootState> & {
    /** the items, controlled; pair it with `onLayoutChange` */
    layout?: Layout | undefined;
    /** the items to start with, uncontrolled */
    defaultLayout?: Layout | undefined;
    /**
     * the layout changed (or, controlled, asks to): once per committed change, never during a
     * gesture, and on mount only when the given layout had to be corrected
     */
    onLayoutChange?: ((layout: Layout) => void) | undefined;
    /** the columns (default 12) */
    cols?: number | undefined;
    /** the rows a gesture may reach (default: unbounded) */
    maxRows?: number | undefined;
    /** how the layout settles (default: `verticalCompactor`) */
    compactor?: Compactor | undefined;
    /** a move or resize into an occupied cell is refused instead of pushing */
    preventCollision?: boolean | undefined;
    /** items may overlap: nothing is pushed and nothing settles */
    allowOverlap?: boolean | undefined;
    /** one row's height in pixels (default 150) */
    rowHeight?: number | undefined;
    /** the space between items, `[inline, block]` in pixels (default `[10, 10]`) */
    gap?: readonly [number, number] | undefined;
    /** the space between the root's edge and the items (default: `gap`) */
    padding?: readonly [number, number] | undefined;
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
    /** the writing direction (default: the root's computed `direction`); set as `dir` too */
    dir?: Direction | undefined;
    onDragStart?: GestureCallback | undefined;
    onDrag?: GestureCallback | undefined;
    onDragStop?: GestureCallback | undefined;
    onResizeStart?: GestureCallback | undefined;
    onResize?: GestureCallback | undefined;
    onResizeStop?: GestureCallback | undefined;
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
] as const satisfies readonly (keyof LayoutItem)[];

/** Whether two layouts hold the same items, field by field, in the same order. */
export function sameLayout(a: Layout, b: Layout): boolean {
    return (
        a === b ||
        (a.length === b.length &&
            a.every((item, index) => {
                const other = b[index];
                return (
                    other !== undefined &&
                    ITEM_KEYS.every((key) => item[key] === other[key])
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
        onLayoutChange,
        cols,
        maxRows,
        compactor,
        preventCollision,
        allowOverlap,
        rowHeight,
        gap,
        padding,
        autoSize,
        width,
        draggable,
        resizable,
        bounded,
        threshold,
        dir,
        onDragStart: _onDragStart,
        onDrag: _onDrag,
        onDragStop: _onDragStop,
        onResizeStart: _onResizeStart,
        onResize: _onResize,
        onResizeStop: _onResizeStop,
        children,
        ...rest
    } = props;
    const latest = useRef(props);
    latest.current = props;

    const [{ model, engine, given }] = useState(() => {
        const start = layout ?? defaultLayout ?? [];
        const created: GridLayoutModel = createGridLayoutModel({
            layout: start,
            cols,
            maxRows,
            compactor,
            preventCollision,
            allowOverlap,
        });
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
            dir,
        });
        return { model: created, engine: bound, given: start };
    });

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
        dir,
    });

    const view = useSyncExternalStore(
        engine.adapter.subscribe,
        engine.adapter.getView,
        engine.adapter.getView,
    );

    // controlled: a change the parent does not take is undone at its next render, which this
    // forces (a parent that ignores onLayoutChange may not render again)
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    /** the prop is being applied: its commit is not a change of the user's to tell */
    const syncing = useRef(false);

    useLayoutEffect(() => {
        const unsubscribe = model.subscribe((event) => {
            if (syncing.current) return;
            if (event.before.layouts === event.after.layouts) return;
            latest.current.onLayoutChange?.(model.get("layout"));
            if (latest.current.layout !== undefined) rerender();
        });
        // on mount, a layout that had to be corrected is told once (D9)
        const current = model.get("layout");
        if (!sameLayout(given, current))
            latest.current.onLayoutChange?.(current);
        return unsubscribe;
    }, [model, given]);

    useLayoutEffect(
        () =>
            engine.subscribe((event) => {
                const name = CALLBACKS[event.type];
                const callback = name ? latest.current[name] : undefined;
                if (typeof callback === "function")
                    (callback as GestureCallback)(event);
            }),
        [engine],
    );

    // the rules, each at its default when the prop is absent: a change re-settles every layout
    // (and is told, as any committed change)
    useLayoutEffect(() => {
        model.run("grid.configure", {
            settings: {
                cols: cols ?? 12,
                maxRows: maxRows ?? Number.POSITIVE_INFINITY,
                compactor: compactor ?? verticalCompactor,
                preventCollision: preventCollision ?? false,
                allowOverlap: allowOverlap ?? false,
            },
        });
    }, [model, cols, maxRows, compactor, preventCollision, allowOverlap]);

    // the controlled layout: the model holds the prop as it settles under the rules. A prop that
    // has to be corrected is applied once and told once; it is not applied again while it stays
    // the same (no loop with a parent that keeps it)
    const checked = useRef<{ prop: Layout; model: Layout } | null>(null);
    useLayoutEffect(() => {
        if (layout === undefined) return;
        const current = model.get("layout");
        const last = checked.current;
        if (last && last.prop === layout && last.model === current) return;
        const settled = normaliseLayout(layout, model.get("rules"));
        if (settled.ok && sameLayout(settled.layout, current)) {
            checked.current = { prop: layout, model: current };
            return;
        }
        syncing.current = true;
        let result: ReturnType<typeof model.run<"layout.set">>;
        try {
            result = model.run("layout.set", { layout });
        } finally {
            syncing.current = false;
        }
        checked.current = { prop: layout, model: model.get("layout") };
        if (result.ok && !sameLayout(result.value.layout, layout)) {
            // the parent's layout had to be corrected: it is told what holds, once
            latest.current.onLayoutChange?.(result.value.layout);
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
        },
    });

    const context = useMemo(() => ({ model, engine }), [model, engine]);
    return (
        <GridLayoutContext.Provider value={context}>
            <ViewContext.Provider value={view}>{element}</ViewContext.Provider>
        </GridLayoutContext.Provider>
    );
}
