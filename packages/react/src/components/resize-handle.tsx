import type { ResizeHandleState, ResizeSide } from "@fragiola/grid-layout";
import type { ReactNode } from "react";
import { useResizeHandle } from "../hooks/use-resize-handle";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

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
