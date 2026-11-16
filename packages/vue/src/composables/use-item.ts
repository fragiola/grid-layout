import { type ItemState, itemPart } from "@fragiola/grid-layout";
import {
    type ComputedRef,
    type CSSProperties,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import { useGridLayoutContext, useViewContext } from "../context";
import { type ElementRef, elementRef, toStyle } from "../utils/render";

/** What a part composable gives an element: bind it with `v-bind`. */
export interface PartProps {
    readonly style: CSSProperties;
    readonly ref: ElementRef;
    readonly tabindex?: number;
    readonly [attribute: `data-${string}`]: string;
}

/** A part composable's result: the state, and the props to bind onto the element. */
export interface PartHookResult<S> {
    readonly state: ComputedRef<S>;
    readonly props: ComputedRef<PartProps>;
}

/** An item: placed at its box, registered with the engine. */
export function useItem(
    itemId: MaybeRefOrGetter<string>,
): PartHookResult<ItemState> {
    const { engine } = useGridLayoutContext("useItem");
    const view = useViewContext("useItem");
    const id = () => toValue(itemId);
    // registered while attached, unregistered when it goes or its id changes
    const ref = elementRef(
        (element) => engine.adapter.registerItem(id(), element),
        () => [id()],
    );
    const part = computed(() => itemPart(view.value, id()));
    return {
        state: computed(() => part.value.state),
        props: computed(() => ({
            ...part.value.attributes,
            style: toStyle(part.value.style),
            tabindex: part.value.tabIndex,
            ref,
        })),
    };
}
