import { computed, type Signal } from "@angular/core";
import {
    type Part,
    type PlaceholderState,
    placeholderPart,
} from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";

/**
 * Where the held item would land (its state, its `data-*`, its structural style); `undefined`
 * when no gesture is in progress. What `*gridLayoutPlaceholder` renders.
 */
export function injectPlaceholder(): Signal<
    Part<PlaceholderState> | undefined
> {
    const { view } = injectGridLayoutContext("injectPlaceholder");
    return computed(() => placeholderPart(view()));
}
