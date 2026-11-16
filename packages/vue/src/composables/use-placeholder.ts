import { type PlaceholderState, placeholderPart } from "@fragiola/grid-layout";
import { type ComputedRef, type CSSProperties, computed } from "vue";
import { useViewContext } from "../context";
import { toStyle } from "../utils/render";

/** The placeholder's state and the props to bind onto its element. */
export interface PlaceholderHookResult {
    readonly state: PlaceholderState;
    readonly props: {
        readonly style: CSSProperties;
        readonly [attribute: `data-${string}`]: string;
    };
}

/** Where the held item would land; `undefined` when no gesture is in progress. */
export function usePlaceholder(): ComputedRef<
    PlaceholderHookResult | undefined
> {
    const view = useViewContext("usePlaceholder");
    return computed(() => {
        const part = placeholderPart(view.value);
        if (!part) return undefined;
        return {
            state: part.state,
            props: { ...part.attributes, style: toStyle(part.style) },
        };
    });
}
