// What a root shares with its parts: the model and engine, the view to render, and, inside an
// item, which item it is.

import type { GridLayoutHandle, GridLayoutView } from "@fragiola/grid-layout";
import { type ComputedRef, type InjectionKey, inject } from "vue";

/** What `useGridLayout()` returns: the grid layout's model and its engine. */
export type GridLayoutContextValue = GridLayoutHandle;

export const GridLayoutKey: InjectionKey<GridLayoutContextValue> =
    Symbol("GridLayout");

/** The view the root renders, following the engine. */
export const ViewKey: InjectionKey<ComputedRef<GridLayoutView>> =
    Symbol("GridLayoutView");

/** The item a part is inside of: its drag and resize handles find it here. */
export const ItemKey: InjectionKey<ComputedRef<string>> =
    Symbol("GridLayoutItem");

/** The root's context, or a clear error outside one. */
export function useGridLayoutContext(part: string): GridLayoutContextValue {
    const value = inject(GridLayoutKey, null);
    if (!value) throw new Error(`${part} must be inside a GridLayout.Root`);
    return value;
}

/** The view, or a clear error outside a root. */
export function useViewContext(part: string): ComputedRef<GridLayoutView> {
    const value = inject(ViewKey, null);
    if (!value) throw new Error(`${part} must be inside a GridLayout.Root`);
    return value;
}

/** The item a handle belongs to: its own `itemId`, else the item it is inside of. */
export function useItemId(
    part: string,
    itemId: () => string | undefined,
): () => string {
    const inside = inject(ItemKey, null);
    // the same error as React's, as early: in setup, not at the first render
    if (itemId() === undefined && !inside) {
        throw new Error(
            `${part} must be inside a GridLayout.Item, or name its itemId`,
        );
    }
    return () => {
        const id = itemId() ?? inside?.value;
        if (id === undefined) {
            throw new Error(
                `${part} must be inside a GridLayout.Item, or name its itemId`,
            );
        }
        return id;
    };
}
