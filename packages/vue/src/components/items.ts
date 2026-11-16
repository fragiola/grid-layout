import type { LayoutItem } from "@fragiola/grid-layout";
import {
    type DefineSetupFnComponent,
    defineComponent,
    Fragment,
    h,
    type SlotsType,
} from "vue";
import { useViewContext } from "../context";
import type { SlotFunction } from "../utils/primitive";

/** `GridLayout.Items` takes no props: its default slot renders each item. */
export type ItemsProps = Record<never, never>;

export interface ItemsSlots {
    /** renders one item, keyed by its id: `v-slot="{ item }"` */
    default?: SlotFunction<{ item: LayoutItem }>;
}

/**
 * The committed layout's items, in order: the default slot renders each one. Nothing renders until
 * the root's width is known (or given): an item then mounts already in place, so an app's
 * transition never animates it in from the corner. It renders no element of its own.
 */
export const Items: DefineSetupFnComponent<
    ItemsProps,
    Record<never, never>,
    SlotsType<ItemsSlots>
> = defineComponent({
    name: "GridLayoutItems",
    slots: Object as SlotsType<ItemsSlots>,
    setup(_, { slots }) {
        const view = useViewContext("Items");
        return () => {
            if (!view.value.geometry) return null;
            return view.value.layout.map((item) =>
                h(Fragment, { key: item.id }, slots.default?.({ item })),
            );
        };
    },
}) as unknown as DefineSetupFnComponent<
    ItemsProps,
    Record<never, never>,
    SlotsType<ItemsSlots>
>;
