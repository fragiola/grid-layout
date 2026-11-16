import type { DragHandleState } from "@fragiola/grid-layout";
import { useDragHandle } from "../composables/use-drag-handle";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface DragHandleProps extends PrimitiveProps {
    /** the item it drags (default: the item it is inside of) */
    itemId?: string | undefined;
}

export interface DragHandleSlots extends RenderSlot<DragHandleState> {
    default?: SlotFunction<{ state: DragHandleState }>;
}

/** The only place its item drags from, and the item's tab stop; renders nothing visible. */
export const DragHandle: GridLayoutComponent<DragHandleProps, DragHandleSlots> =
    definePrimitive<DragHandleProps, DragHandleSlots>(
        "DragHandle",
        ["itemId", "as"],
        (props, { attrs, slots }) => {
            const handle = useDragHandle(() => props.itemId);
            return () => {
                const { ref, style, ...own } = handle.props.value;
                const state = handle.state.value;
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
