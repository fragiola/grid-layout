import type { ItemState } from "@fragiola/grid-layout";
import { computed, provide } from "vue";
import { useItem } from "../composables/use-item";
import { ItemKey } from "../context";
import {
    definePrimitive,
    type GridLayoutComponent,
    type PrimitiveProps,
    type SlotFunction,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

export interface ItemProps extends PrimitiveProps {
    /** the item's id in the layout */
    itemId: string;
}

export interface ItemSlots extends RenderSlot<ItemState> {
    /** the item's content, its handles among it */
    default?: SlotFunction<{ state: ItemState }>;
}

/** An item: placed at its box, a tab stop (unless it has a drag handle), dragged from its body. */
export const Item: GridLayoutComponent<ItemProps, ItemSlots> = definePrimitive<
    ItemProps,
    ItemSlots
>("Item", ["itemId", "as"], (props, { attrs, slots }) => {
    provide(
        ItemKey,
        computed(() => props.itemId),
    );
    const item = useItem(() => props.itemId);
    return () => {
        const { ref, style, ...own } = item.props.value;
        const state = item.state.value;
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
});
