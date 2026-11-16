import type { GridLayoutView } from "@fragiola/grid-layout";
import { useContext } from "react";
import { ViewContext } from "../context";
import type { GridLayoutRef } from "../utils/grid-layout-ref";
import { useGrid, useViewOf } from "./internal";

/** The view the root renders: sizes, rects, the gesture in progress. */
export function useGridLayoutView(): GridLayoutView;
/** The view of the grid a ref holds, from anywhere: `undefined` until a root holds it. */
export function useGridLayoutView(
    gridLayoutRef: GridLayoutRef | undefined,
): GridLayoutView | undefined;
export function useGridLayoutView(
    gridLayoutRef?: GridLayoutRef,
): GridLayoutView | undefined {
    const grid = useGrid("useGridLayoutView", gridLayoutRef);
    const followed = useViewOf(gridLayoutRef ? grid : null);
    const around = useContext(ViewContext);
    return gridLayoutRef ? followed : (around ?? undefined);
}
