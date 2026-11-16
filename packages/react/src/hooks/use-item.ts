import { type ItemState, itemPart } from "@fragiola/grid-layout";
import type * as React from "react";
import { useCallback } from "react";
import { useGridLayoutContext, useViewContext } from "../context";

/** A part hook's result: the state, and the props to spread onto the element. */
export interface PartHookResult<S> {
    readonly state: S;
    readonly props: {
        readonly style: React.CSSProperties;
        readonly ref: React.RefCallback<HTMLElement>;
        readonly tabIndex?: number;
        readonly [attribute: `data-${string}`]: string;
    };
}

/** An item: placed at its box, registered with the engine. */
export function useItem(itemId: string): PartHookResult<ItemState> {
    const { engine } = useGridLayoutContext("useItem");
    const view = useViewContext("useItem");
    const ref = useCallback(
        // registered while attached, unregistered by the returned cleanup (React 19)
        (element: HTMLElement | null) =>
            element ? engine.adapter.registerItem(itemId, element) : undefined,
        [engine, itemId],
    );
    const part = itemPart(view, itemId);
    return {
        state: part.state,
        props: {
            ...part.attributes,
            style: part.style as React.CSSProperties,
            tabIndex: part.tabIndex,
            ref,
        },
    };
}
