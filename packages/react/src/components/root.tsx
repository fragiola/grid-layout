// The root: one grid layout. It creates the model and the engine once, renders the view, maps the
// declarative props onto commands (D3) and tells the app what changed (D9).

import {
    attachGridLayoutRef,
    type Breakpoints,
    type Compactor,
    type ConstraintRegistry,
    createGridLayoutRootBinding,
    type Direction,
    type DropDetails,
    type ExternalDragAnswer,
    type GestureCallback,
    type GridLayoutEngineOptions,
    type GridLayoutRef,
    type Layout,
    type LayoutConstraint,
    type PerBreakpoint,
    type RootState,
    rootPart,
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
import { GridLayoutContext, ViewContext } from "../context";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export type { GestureCallback, RootState };

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

    // the model and the engine, made from the first props; the steps below keep them in line with
    // the latest ones (the core's, so every adapter decides the same)
    const [binding] = useState(() =>
        createGridLayoutRootBinding(() => latest.current),
    );
    const { model, engine } = binding;

    // the engine's options after each render: setting them may tell a new view, which must not
    // happen while React renders
    useLayoutEffect(() => {
        binding.setOptions();
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

    useLayoutEffect(() => binding.listenModel(rerender), [binding]);

    useLayoutEffect(() => binding.listenEngine(), [binding]);

    // the rules, the controlled layouts and the controlled layout, after each render
    useLayoutEffect(() => {
        binding.configure();
    });
    useLayoutEffect(() => {
        binding.syncLayouts();
    });
    useLayoutEffect(() => {
        binding.syncLayout();
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
