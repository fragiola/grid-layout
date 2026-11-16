import {
    type ResizeHandleState,
    type ResizeSide,
    resizeHandlePart,
} from "@fragiola/grid-layout";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useGridLayoutContext, useItemId, useViewContext } from "../context";
import { elementRef, toStyle } from "../utils/render";
import type { PartHookResult } from "./use-item";

/** A resize handle for a side or corner; `state.resizable` false: render none. */
export function useResizeHandle(
    side: MaybeRefOrGetter<ResizeSide>,
    itemId?: MaybeRefOrGetter<string | undefined>,
): PartHookResult<ResizeHandleState> {
    const { engine } = useGridLayoutContext("useResizeHandle");
    const view = useViewContext("useResizeHandle");
    const id = useItemId("useResizeHandle", () => toValue(itemId));
    const ref = elementRef(
        (element) =>
            engine.adapter.registerResizeHandle(id(), toValue(side), element),
        () => [id(), toValue(side)],
    );
    const part = computed(() =>
        resizeHandlePart(view.value, id(), toValue(side)),
    );
    return {
        state: computed(() => part.value.state),
        props: computed(() => ({
            ...part.value.attributes,
            style: toStyle(part.value.style),
            ref,
        })),
    };
}
