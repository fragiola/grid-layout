import type { DragPreviewState, GridLayoutRef } from "@fragiola/grid-layout";
import { useDragPreview } from "../composables/use-drag-preview";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface DragPreviewProps extends PrimitiveProps {
    /** the grid, for a preview outside its root (inside one, the root around it) */
    gridLayoutRef?: GridLayoutRef | undefined;
}

export interface DragPreviewSlots extends RenderSlot<DragPreviewState> {
    /** what it shows: the app's, from its state (the drop's `data`) */
    default?: SlotFunction<{ state: DragPreviewState }>;
}

/**
 * What follows the pointer while it brings a new item: rendered only then, kept at the pointer by
 * the engine (`position: fixed`, so no transformed ancestor). Its look is the app's.
 */
export const DragPreview: GridLayoutComponent<
    DragPreviewProps,
    DragPreviewSlots
> = definePrimitive<DragPreviewProps, DragPreviewSlots>(
    "DragPreview",
    ["gridLayoutRef", "as"],
    (props, { attrs, slots }) => {
        const preview = useDragPreview(() => props.gridLayoutRef);
        return () => {
            const current = preview.value;
            // the app's slot runs only while there is a state
            if (!current) return null;
            const { ref, style, ...own } = current.props;
            const state = current.state;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                props: own,
                style,
                ref,
                // the engine writes its transform
                reserved: ["transform"],
                children: () => slots.default?.({ state }),
            });
        };
    },
);
