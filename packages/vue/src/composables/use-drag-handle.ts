import { type DragHandleState, dragHandlePart } from "@fragiola/grid-layout";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useGridLayoutContext, useItemId, useViewContext } from "../context";
import { elementRef, toStyle } from "../utils/render";
import type { PartHookResult } from "./use-item";

/** A drag handle: the only place its item drags from, and its tab stop. */
export function useDragHandle(
    itemId?: MaybeRefOrGetter<string | undefined>,
): PartHookResult<DragHandleState> {
    const { engine } = useGridLayoutContext("useDragHandle");
    const view = useViewContext("useDragHandle");
    const id = useItemId("useDragHandle", () => toValue(itemId));
    const ref = elementRef(
        (element) => engine.adapter.registerDragHandle(id(), element),
        () => [id()],
    );
    const part = computed(() => dragHandlePart(view.value, id()));
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
