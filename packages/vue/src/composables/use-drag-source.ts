import {
    type DragSourceState,
    type DropDetails,
    type DropItem,
    dragSourcePart,
    dragSourceStatus,
    dropDetailsOf,
    type ExternalDrop,
    type GridLayoutRef,
    isDropFrom,
} from "@fragiola/grid-layout";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
    watchEffect,
} from "vue";
import { elementRef, toStyle, useExternal } from "../utils/render";
import { useGrid } from "./internal";
import type { PartProps } from "./use-item";

/** What makes an element a drag source. */
export interface DragSourceOptions {
    /** the new item's size and limits */
    readonly item: DropItem;
    /** the new item's id (default: `createId`'s, else a random UUID) */
    readonly itemId?: string | undefined;
    /** the app's own data, told back in the gesture's events and `onDrop` */
    readonly data?: unknown;
    /** where the item sits from the pointer, in pixels on screen (default: centred under it) */
    readonly dragOffset?: ExternalDrop["dragOffset"];
    /** starts nothing, and is no tab stop */
    readonly disabled?: boolean | undefined;
    /** the grid, for a source outside its root (inside one, the root around it) */
    readonly gridLayoutRef?: GridLayoutRef | undefined;
    /** an item from this source was added */
    readonly onDrop?: ((drop: DropDetails) => void) | undefined;
}

/** A drag source's props: the part's, and the listeners that start a drop (after the app's own). */
export interface DragSourceHookResult {
    readonly state: ComputedRef<DragSourceState>;
    readonly props: ComputedRef<
        PartProps & {
            readonly onPointerdown: (event: PointerEvent) => void;
            readonly onKeydown: (event: KeyboardEvent) => void;
        }
    >;
}

/**
 * A drag source (X1, X6): pressed and dragged, or Space/Enter, it brings a new item into the grid.
 * Bind its listeners after the element's own: `preventDefault` there vetoes the drop.
 */
export function useDragSource(
    options: MaybeRefOrGetter<DragSourceOptions>,
): DragSourceHookResult {
    const grid = useGrid("useDragSource", () => toValue(options).gridLayoutRef);
    const engine = () => grid.value?.engine;
    let element: HTMLElement | null = null;
    // only this source's part of the view: a gesture elsewhere renders nothing here
    const status = useExternal(
        () => engine()?.adapter.subscribe,
        () => dragSourceStatus(engine()?.adapter.getView(), element),
    );
    const ref = elementRef(
        (node) => {
            element = node;
            const bound = engine();
            // leaving the page ends what it started
            return () => {
                bound?.adapter.releaseSource(node);
                if (element === node) element = null;
            };
        },
        () => [engine()],
    );
    // `onDrop`: the drops this source started
    watchEffect((onCleanup) => {
        const bound = engine();
        if (!bound) return;
        onCleanup(
            bound.subscribe((event) => {
                if (isDropFrom(event, element)) {
                    toValue(options).onDrop?.(dropDetailsOf(event));
                }
            }),
        );
    });
    const dropOf = (): ExternalDrop => {
        const { item, itemId, data, dragOffset } = toValue(options);
        return { item, itemId, data, dragOffset };
    };
    const part = computed(() => {
        status.value;
        return dragSourcePart(
            engine()?.adapter.getView(),
            element,
            toValue(options).disabled === true,
        );
    });
    return {
        state: computed(() => part.value.state),
        props: computed(() => ({
            ...part.value.attributes,
            style: toStyle(part.value.style),
            tabindex: part.value.tabIndex,
            ref,
            onPointerdown: (event: PointerEvent) => {
                const bound = engine();
                if (!bound || toValue(options).disabled === true || !element)
                    return;
                bound.adapter.startExternalDrag(event, element, dropOf());
            },
            onKeydown: (event: KeyboardEvent) => {
                const bound = engine();
                if (!bound || toValue(options).disabled === true || !element)
                    return;
                bound.adapter.startExternalGrab(event, element, dropOf());
            },
        })),
    };
}
