import type { GestureEvent, Layout, LayoutItem } from "@fragiola/grid-layout";

/** What a drop gives its callbacks: the item as added, the source's data, the layout. */
export interface DropDetails {
    readonly item: LayoutItem;
    readonly data: unknown;
    readonly layout: Layout;
}

/** A drop's details, from its event. */
export function dropDetailsOf(event: GestureEvent): DropDetails {
    return { item: event.item, data: event.data, layout: event.layout };
}
