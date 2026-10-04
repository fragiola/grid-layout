// The parts under a root, each over its hook: the developer owns the recursion (D4), so `Items`
// is a children function over the model's items, and an item's handles are elements the app
// renders where and how it wants.

import type {
    DragHandleState,
    ItemState,
    LayoutItem,
    PlaceholderState,
    ResizeHandleState,
    ResizeSide,
} from "@fragiola/grid-layout";
import { Fragment, type ReactNode } from "react";
import { ItemContext } from "./context";
import {
    useDragHandle,
    useGridLayoutView,
    useItem,
    useItems,
    usePlaceholder,
    useResizeHandle,
} from "./hooks";
import { type DivPrimitiveProps, useRenderElement } from "./utils/useRender";

export { Root, type RootProps, type RootState } from "./Root";

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
