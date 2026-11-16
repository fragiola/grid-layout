import type { DragHandleState } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { useDragHandle } from "../hooks/use-drag-handle";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

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
