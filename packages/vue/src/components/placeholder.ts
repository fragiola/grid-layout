import type { PlaceholderState } from "@fragiola/grid-layout";
import { usePlaceholder } from "../composables/use-placeholder";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export type PlaceholderProps = PrimitiveProps;

export interface PlaceholderSlots extends RenderSlot<PlaceholderState> {
    default?: SlotFunction<{ state: PlaceholderState }>;
}

/** Where the held item would land: rendered only during a gesture. */
export const Placeholder: GridLayoutComponent<
    PlaceholderProps,
    PlaceholderSlots
> = definePrimitive<PlaceholderProps, PlaceholderSlots>(
    "Placeholder",
    ["as"],
    (props, { attrs, slots }) => {
        const placeholder = usePlaceholder();
        return () => {
            const current = placeholder.value;
            if (!current) return null;
            const { style, ...own } = current.props;
            const state = current.state;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                props: own,
                style,
                children: () => slots.default?.({ state }),
            });
        };
    },
);
