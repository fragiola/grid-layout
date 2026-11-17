import type { Signal } from "@angular/core";
import type { GridLayoutRef, GridLayoutView } from "@fragiola/grid-layout";
import { injectGridLayoutContext, injectRootOrRef } from "../context";
import { gridOf, viewOf } from "../utils/signals";

/** The view the root renders: sizes, rects, the gesture in progress. */
export function injectGridLayoutView(): Signal<GridLayoutView>;
/** The view of the grid a ref holds, from anywhere: `undefined` until a root holds it. */
export function injectGridLayoutView(
    gridLayoutRef: GridLayoutRef | undefined,
): Signal<GridLayoutView | undefined>;
export function injectGridLayoutView(
    ...args: [] | [GridLayoutRef | undefined]
): Signal<GridLayoutView | undefined> {
    if (args.length === 0) {
        return injectGridLayoutContext("injectGridLayoutView").view;
    }
    const [gridLayoutRef] = args;
    return viewOf(
        gridOf(
            () => gridLayoutRef,
            injectRootOrRef("injectGridLayoutView", gridLayoutRef),
        ),
    );
}
