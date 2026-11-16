import {
    type DragSourceState,
    type DropDetails,
    type DropItem,
    dragSourcePart,
    dragSourceStatus,
    dropDetailsOf,
    type ExternalDrop,
    isDropFrom,
} from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { type GridLayoutRef, noSubscription } from "../utils/grid-layout-ref";
import { useGrid } from "./internal";
import type { PartHookResult } from "./use-item";

const noStatus = () => "";

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

/** A drag source's props: the part's, and the handlers that start a drop (after the app's own). */
export interface DragSourceHookResult {
    readonly state: DragSourceState;
    readonly props: PartHookResult<DragSourceState>["props"] & {
        readonly onPointerDown: (event: React.PointerEvent) => void;
        readonly onKeyDown: (event: React.KeyboardEvent) => void;
    };
}

/**
 * A drag source (X1, X6): pressed and dragged, or Space/Enter, it brings a new item into the grid.
 * Spread its handlers after the element's own: `preventDefault` there vetoes the drop.
 */
export function useDragSource(
    options: DragSourceOptions,
): DragSourceHookResult {
    const grid = useGrid("useDragSource", options.gridLayoutRef);
    const latest = useRef(options);
    latest.current = options;
    const element = useRef<HTMLElement | null>(null);
    const engine = grid?.engine;
    const disabled = options.disabled === true;
    // only this source's part of the view: a gesture elsewhere renders nothing here (and the
    // check allocates nothing, on every view change of every source)
    const statusNow = () =>
        dragSourceStatus(engine?.adapter.getView(), element.current);
    useSyncExternalStore(
        engine ? engine.adapter.subscribe : noSubscription,
        statusNow,
        noStatus,
    );
    const ref = useCallback(
        (node: HTMLElement | null) => {
            element.current = node;
            if (!node) return undefined;
            // leaving the page ends what it started (React 19's ref cleanup)
            return () => {
                engine?.adapter.releaseSource(node);
                if (element.current === node) element.current = null;
            };
        },
        [engine],
    );
    // `onDrop`: the drops this source started
    useEffect(
        () =>
            engine?.subscribe((event) => {
                if (isDropFrom(event, element.current)) {
                    latest.current.onDrop?.(dropDetailsOf(event));
                }
            }),
        [engine],
    );
    const dropOf = (): ExternalDrop => {
        const { item, itemId, data, dragOffset } = latest.current;
        return { item, itemId, data, dragOffset };
    };
    const part = dragSourcePart(
        engine?.adapter.getView(),
        element.current,
        disabled,
    );
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            tabIndex: part.tabIndex,
            ref,
            onPointerDown: (event) => {
                if (!engine || disabled || !element.current) return;
                engine.adapter.startExternalDrag(
                    event.nativeEvent,
                    element.current,
                    dropOf(),
                );
            },
            onKeyDown: (event) => {
                if (!engine || disabled || !element.current) return;
                engine.adapter.startExternalGrab(
                    event.nativeEvent,
                    element.current,
                    dropOf(),
                );
            },
        },
    };
}
