import type { DragSourceState } from "@fragiola/grid-layout";
import {
    type DragSourceOptions,
    useDragSource,
} from "../composables/use-drag-source";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

// `onDrop` is the new item's callback here (`@drop`), not the element's native drop listener (a
// drag source is never a drop target)
export interface DragSourceProps extends PrimitiveProps, DragSourceOptions {}

export interface DragSourceSlots extends RenderSlot<DragSourceState> {
    /** the source's content; the primitive renders no text of its own */
    default?: SlotFunction<{ state: DragSourceState }>;
}

/**
 * An element anywhere on the page that brings a new item into the grid: pressed and dragged, or
 * Space/Enter from the keyboard (X1, X6). Outside the root it takes the grid's `gridLayoutRef`.
 * It is a tab stop, and renders only its slot.
 */
export const DragSource: GridLayoutComponent<DragSourceProps, DragSourceSlots> =
    definePrimitive<DragSourceProps, DragSourceSlots>(
        "DragSource",
        [
            "item",
            "itemId",
            "data",
            "dragOffset",
            "disabled",
            "gridLayoutRef",
            "onDrop",
            "as",
        ],
        (props, { attrs, slots }) => {
            const source = useDragSource(() => ({
                item: props.item,
                itemId: props.itemId,
                data: props.data,
                dragOffset: props.dragOffset,
                disabled: props.disabled,
                gridLayoutRef: props.gridLayoutRef,
                onDrop: props.onDrop,
            }));
            return () => {
                const { ref, style, onPointerdown, onKeydown, ...own } =
                    source.props.value;
                const state = source.state.value;
                return renderElement({
                    tag: "div",
                    as: props.as,
                    attrs,
                    render: slots.render,
                    state,
                    props: own,
                    style,
                    ref,
                    // the engine's after the app's own listeners: `preventDefault` vetoes the drop
                    after: { onPointerdown, onKeydown },
                    children: () => slots.default?.({ state }),
                });
            };
        },
        ["disabled"],
    );
