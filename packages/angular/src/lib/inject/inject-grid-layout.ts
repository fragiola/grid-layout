import type { Signal } from "@angular/core";
import type { GridLayoutHandle, GridLayoutRef } from "@fragiola/grid-layout";
import { injectGridLayoutContext, injectRootOrRef } from "../context";
import { gridOf } from "../utils/signals";

/**
 * The grid layout's model and engine, inside a `[gridLayoutRoot]` (they never change): read it in
 * an effect, a computed or a handler (`grid().model.run("item.move", …)`). Call it in an
 * injection context.
 */
export function injectGridLayout(): Signal<GridLayoutHandle>;
/** The grid layout's model and engine, from anywhere: `null` until a root holds the ref. */
export function injectGridLayout(
    gridLayoutRef: GridLayoutRef | undefined,
): Signal<GridLayoutHandle | null>;
export function injectGridLayout(
    ...args: [] | [GridLayoutRef | undefined]
): Signal<GridLayoutHandle | null> {
    if (args.length === 0) {
        return injectGridLayoutContext("injectGridLayout").handle;
    }
    const [gridLayoutRef] = args;
    return gridOf(
        "injectGridLayout",
        () => gridLayoutRef,
        injectRootOrRef("injectGridLayout", gridLayoutRef),
    );
}
