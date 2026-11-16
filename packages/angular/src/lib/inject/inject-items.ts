import { computed, type Signal } from "@angular/core";
import type { Layout } from "@fragiola/grid-layout";
import { injectGridLayoutContext } from "../context";

/** The committed layout's items, in order. */
export function injectItems(): Signal<Layout> {
    const { view } = injectGridLayoutContext("injectItems");
    return computed(() => view().layout);
}
