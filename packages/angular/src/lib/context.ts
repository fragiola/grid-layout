// What a root shares with its parts: the grid (its model and engine) and the view to render, and,
// inside an item, which item it is.

import { InjectionToken, inject, type Signal } from "@angular/core";
import type {
    GridLayoutHandle,
    GridLayoutRef,
    GridLayoutView,
} from "@fragiola/grid-layout";

/** The context of a `[gridLayoutRoot]`. */
export interface GridLayoutContext {
    /**
     * the grid's model and engine, made from the root's first inputs: reading it before they are
     * set (in a constructor) throws
     */
    readonly handle: Signal<GridLayoutHandle>;
    /** the view the root renders, following the engine (an empty one before the grid exists) */
    readonly view: Signal<GridLayoutView>;
}

export const GRID_LAYOUT_CONTEXT = new InjectionToken<GridLayoutContext>(
    "GridLayout",
);

/** The item a part is inside of: its drag and resize handles find it here. */
export interface GridLayoutItemContext {
    readonly itemId: Signal<string>;
}

export const GRID_LAYOUT_ITEM = new InjectionToken<GridLayoutItemContext>(
    "GridLayoutItem",
);

/** The root's context, or a clear error outside one. */
export function injectGridLayoutContext(part: string): GridLayoutContext {
    const context = inject(GRID_LAYOUT_CONTEXT, { optional: true });
    if (!context)
        throw new Error(`${part} must be used inside [gridLayoutRoot]`);
    return context;
}

/** The root's context, or `null` outside one (a part that may take a `gridLayoutRef`). */
export function injectOptionalGridLayoutContext(): GridLayoutContext | null {
    return inject(GRID_LAYOUT_CONTEXT, { optional: true });
}

/** The item a handle is inside of, or `null`. */
export function injectItemContext(): GridLayoutItemContext | null {
    return inject(GRID_LAYOUT_ITEM, { optional: true });
}

/**
 * The item a handle works for: its own id (`given`), else the item it is inside of; `undefined`
 * with neither (as before a handle outside an item has its inputs: a binding on its own element
 * reads its state first). Neither is an error once the inputs are set ({@link requireHandleItemId}).
 */
export function injectHandleItemId(
    given: () => string | undefined,
): () => string | undefined {
    const inside = injectItemContext();
    return () => given() ?? inside?.itemId();
}

/** The handle's item, or a clear error, named for `part`, without one. */
export function requireHandleItemId(
    part: string,
    itemId: string | undefined,
): string {
    if (itemId === undefined) {
        throw new Error(
            `${part} must be used inside [gridLayoutItem], or name its item`,
        );
    }
    return itemId;
}

/**
 * The root around, or `null` with a `gridLayoutRef` (which then wins): neither is a clear error,
 * at once.
 */
export function injectRootOrRef(
    part: string,
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutContext | null {
    const around = injectOptionalGridLayoutContext();
    if (!gridLayoutRef && !around) {
        throw new Error(
            `${part} must be used inside [gridLayoutRoot], or take a gridLayoutRef`,
        );
    }
    return around;
}
