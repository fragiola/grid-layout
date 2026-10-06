// The parts under a root, each over its hook: the developer owns the recursion (D4), so `Items`
// is a children function over the model's items, and an item's handles are elements the app
// renders where and how it wants.

import type {
    CellRows,
    CellState,
    DragHandleState,
    DragPreviewState,
    DragSourceState,
    ItemState,
    LayoutItem,
    PlaceholderState,
    ResizeHandleState,
    ResizeSide,
} from "@fragiola/grid-layout";
import { Fragment, type ReactNode } from "react";
import { ItemContext } from "./context";
import type { GridLayoutRef } from "./gridLayoutRef";
import {
    type CellHookResult,
    type DragSourceOptions,
    useCells,
    useDragHandle,
    useDragPreview,
    useDragSource,
    useGridLayoutView,
    useItem,
    useItems,
    usePlaceholder,
    useResizeHandle,
} from "./hooks";
import { type DivPrimitiveProps, useRenderElement } from "./utils/useRender";

export { Root, type RootProps, type RootState } from "./Root";

/** A primitive's props, without the DOM's own `onDrop` (a drop's callback here). */
type WithoutDomDrop<P> = Omit<P, "onDrop">;

export interface ItemsProps {
    /** renders one item, keyed by its id */
    children: (item: LayoutItem) => ReactNode;
}

/**
 * The committed layout's items, in order: `children` renders each one. Nothing renders until the
 * root's width is known (or given): an item then mounts already in place, so an app's transition
 * never animates it in from the corner.
 */
export function Items({ children }: ItemsProps) {
    const view = useGridLayoutView();
    const items = useItems();
    if (!view.geometry) return null;
    return items.map((item) => (
        <Fragment key={item.id}>{children(item)}</Fragment>
    ));
}

export type ItemProps = DivPrimitiveProps<ItemState> & {
    /** the item's id in the layout */
    itemId: string;
    children?: ReactNode;
};

/** An item: placed at its box, a tab stop (unless it has a drag handle), dragged from its body. */
export function Item(props: ItemProps) {
    const { itemId, children, ...rest } = props;
    const { state, props: own } = useItem(itemId);
    const { ref, ...internal } = own;
    const element = useRenderElement("div", rest, {
        state,
        props: internal,
        ref,
        children,
    });
    return (
        <ItemContext.Provider value={itemId}>{element}</ItemContext.Provider>
    );
}

export type DragHandleProps = DivPrimitiveProps<DragHandleState> & {
    /** the item it drags (default: the item it is inside of) */
    itemId?: string | undefined;
    children?: ReactNode;
};

/** The only place its item drags from, and the item's tab stop; renders nothing visible. */
export function DragHandle(props: DragHandleProps) {
    const { itemId, children, ...rest } = props;
    const { state, props: own } = useDragHandle(itemId);
    const { ref, ...internal } = own;
    return useRenderElement("div", rest, {
        state,
        props: internal,
        ref,
        children,
    });
}

export type ResizeHandleProps = DivPrimitiveProps<ResizeHandleState> & {
    /** the side or corner it pulls */
    side: ResizeSide;
    /** the item it resizes (default: the item it is inside of) */
    itemId?: string | undefined;
    children?: ReactNode;
};

/** A side or corner its item is resized from; nothing while the item cannot be resized. */
export function ResizeHandle(props: ResizeHandleProps) {
    const { side, itemId, children, ...rest } = props;
    const { state, props: own } = useResizeHandle(side, itemId);
    const { ref, ...internal } = own;
    const element = useRenderElement("div", rest, {
        state,
        props: internal,
        ref,
        children,
    });
    return state.resizable ? element : null;
}

export type PlaceholderProps = DivPrimitiveProps<PlaceholderState> & {
    children?: ReactNode;
};

/** Where the held item would land: rendered only during a gesture. */
export function Placeholder(props: PlaceholderProps) {
    const { children, ...rest } = props;
    const placeholder = usePlaceholder();
    const element = useRenderElement("div", rest, {
        state: placeholder?.state ?? { itemId: "", kind: "move" },
        props: placeholder?.props ?? {},
        children,
    });
    return placeholder ? element : null;
}

/** `GridLayout.DragSource`'s props: what it brings, and an element's own. */
export type DragSourceProps = WithoutDomDrop<
    DivPrimitiveProps<DragSourceState>
> &
    DragSourceOptions & {
        children?: ReactNode;
    };

/**
 * An element anywhere on the page that brings a new item into the grid: pressed and dragged, or
 * Space/Enter from the keyboard (X1, X6). Outside the root it takes the grid's `gridLayoutRef`.
 * It is a tab stop, and renders only its children.
 */
export function DragSource(props: DragSourceProps) {
    const {
        item,
        itemId,
        data,
        dragOffset,
        disabled,
        gridLayoutRef,
        onDrop,
        children,
        ...rest
    } = props;
    const { state, props: own } = useDragSource({
        item,
        itemId,
        data,
        dragOffset,
        disabled,
        gridLayoutRef,
        onDrop,
    });
    const { ref, onPointerDown, onKeyDown, ...internal } = own;
    return useRenderElement("div", rest, {
        state,
        props: internal,
        ref,
        children,
        // the engine's after the app's own handlers: `preventDefault` vetoes the drop
        after: { onPointerDown, onKeyDown },
    });
}

/** `GridLayout.DragPreview`'s props: its grid, its children, and an element's own. */
export type DragPreviewProps = DivPrimitiveProps<DragPreviewState> & {
    /** the grid, for a preview outside its root (inside one, the root around it) */
    gridLayoutRef?: GridLayoutRef | undefined;
    /** what it shows: the app's, or a function of its state (the drop's `data`) */
    children?: ReactNode | ((state: DragPreviewState) => ReactNode);
};

/**
 * What follows the pointer while it brings a new item: rendered only then, kept at the pointer by
 * the engine (`position: fixed`, so no transformed ancestor). Its look is the app's.
 */
export function DragPreview(props: DragPreviewProps) {
    const { gridLayoutRef, ...rest } = props;
    const preview = useDragPreview(gridLayoutRef);
    // the app's functions of the state run only while there is one
    return preview ? <ShownPreview {...rest} preview={preview} /> : null;
}

function ShownPreview(
    props: Omit<DragPreviewProps, "gridLayoutRef"> & {
        preview: NonNullable<ReturnType<typeof useDragPreview>>;
    },
) {
    const { preview, children, ...rest } = props;
    const { ref, ...internal } = preview.props;
    return useRenderElement("div", rest, {
        state: preview.state,
        props: internal,
        ref,
        children:
            typeof children === "function" ? children(preview.state) : children,
        // the engine writes its transform
        drop: ["transform"],
    });
}

/** `GridLayout.Cells`' props: how many rows, what each cell holds, and each cell element's own. */
export type CellsProps = DivPrimitiveProps<CellState> & {
    /** how many rows: a number, or `auto` (default), the layout's bottom plus one */
    rows?: CellRows | undefined;
    /** what each cell holds, from its state */
    children?: ((cell: CellState) => ReactNode) | undefined;
};

/**
 * The grid's cells, one element each (K6): a background the app draws, placed as a 1 × 1 item
 * there, with structural style only. `className`, `style` and `render` apply to each cell.
 */
export function Cells(props: CellsProps) {
    const { rows, children, ...rest } = props;
    const cells = useCells(rows);
    return cells.map((cell) => (
        <Cell key={`${cell.state.x},${cell.state.y}`} cell={cell} props={rest}>
            {children?.(cell.state)}
        </Cell>
    ));
}

function Cell({
    cell,
    props,
    children,
}: {
    cell: CellHookResult;
    props: DivPrimitiveProps<CellState>;
    children?: ReactNode;
}) {
    return useRenderElement("div", props, {
        state: cell.state,
        props: cell.props,
        children,
    });
}
