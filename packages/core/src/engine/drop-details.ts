// What a drop tells the app (`onDrop`, on a root and on a drag source), in every adapter.

import type { Layout, LayoutItem } from "../layout/types";
import type { GestureEvent, GridLayoutView } from "./types";

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

/** Adapter-only (an app never calls it): whether an event is the drop a drag source's element started. */
export function isDropFrom(
    event: GestureEvent,
    source: HTMLElement | null,
): boolean {
    return (
        event.type === "drop" &&
        event.external &&
        event.origin !== undefined &&
        event.origin === source
    );
}

/**
 * Adapter-only (an app never calls it): how the drop a drag source's element started is being made (`pointer`,
 * `keyboard`), or `""` when it started none: only this changes what the source shows, so a
 * gesture elsewhere renders nothing there (and the check allocates nothing).
 */
export function dragSourceStatus(
    view: GridLayoutView | undefined,
    source: HTMLElement | null,
): string {
    const gesture = view?.gesture;
    return gesture?.kind === "drop" &&
        source !== null &&
        gesture.origin === source
        ? gesture.source
        : "";
}
