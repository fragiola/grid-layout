import type { ResizeHandleState, ResizeSide } from "@fragiola/grid-layout";
import { useResizeHandle } from "../composables/use-resize-handle";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ResizeHandleProps extends PrimitiveProps {
    /** the side or corner it pulls */
    side: ResizeSide;
    /** the item it resizes (default: the item it is inside of) */
    itemId?: string | undefined;
}

export interface ResizeHandleSlots extends RenderSlot<ResizeHandleState> {
    default?: SlotFunction<{ state: ResizeHandleState }>;
}

/** A side or corner its item is resized from; nothing while the item cannot be resized. */
export const ResizeHandle: GridLayoutComponent<
    ResizeHandleProps,
    ResizeHandleSlots
> = definePrimitive<ResizeHandleProps, ResizeHandleSlots>(
    "ResizeHandle",
    ["side", "itemId", "as"],
    (props, { attrs, slots }) => {
        const handle = useResizeHandle(
            () => props.side,
            () => props.itemId,
        );
        return () => {
            const state = handle.state.value;
            if (!state.resizable) return null;
            const { ref, style, ...own } = handle.props.value;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                props: own,
                style,
                ref,
                children: () => slots.default?.({ state }),
            });
        };
    },
);
