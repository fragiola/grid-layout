// What a root shares with its parts: the model and engine, the view to render, and, inside an
// item, which item it is.

import type {
    GridLayoutEngine,
    GridLayoutModel,
    GridLayoutView,
} from "@fragiola/grid-layout";
import { createContext, useContext } from "react";

/** What `useGridLayout()` returns: the grid layout's model and its engine. */
export interface GridLayoutContextValue {
    readonly model: GridLayoutModel;
    readonly engine: GridLayoutEngine;
}

export const GridLayoutContext = createContext<GridLayoutContextValue | null>(
    null,
);

export const ViewContext = createContext<GridLayoutView | null>(null);

/** The item a part is inside of: its drag and resize handles find it here. */
export const ItemContext = createContext<string | null>(null);

/** The root's context, or a clear error outside one. */
export function useGridLayoutContext(part: string): GridLayoutContextValue {
    const value = useContext(GridLayoutContext);
    if (!value) throw new Error(`${part} must be inside a GridLayout.Root`);
    return value;
}

/** The view, or a clear error outside a root. */
export function useViewContext(part: string): GridLayoutView {
    const value = useContext(ViewContext);
    if (!value) throw new Error(`${part} must be inside a GridLayout.Root`);
    return value;
}

/** The item a handle belongs to: its own `itemId`, else the item it is inside of. */
export function useItemId(part: string, itemId: string | undefined): string {
    const inside = useContext(ItemContext);
    const id = itemId ?? inside;
    if (id === null) {
        throw new Error(
            `${part} must be inside a GridLayout.Item, or name its itemId`,
        );
    }
    return id;
}
