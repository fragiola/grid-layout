import type { ItemState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { ItemContext } from "../context";
import { useItem } from "../hooks/use-item";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

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
