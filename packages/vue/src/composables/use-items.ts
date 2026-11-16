import type { Layout } from "@fragiola/grid-layout";
import { type ComputedRef, computed } from "vue";
import { useViewContext } from "../context";

/** The committed layout's items, in order. */
export function useItems(): ComputedRef<Layout> {
    const view = useViewContext("useItems");
    return computed(() => view.value.layout);
}
