// @fragiola/grid-layout: the framework-free core of the headless grid layout.

export {
    bottom,
    collides,
    collisions,
    firstCollision,
    overlaps,
} from "./layout/collision";
export {
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "./layout/compact";
export {
    addItem,
    compactLayout,
    firstFreeCell,
    moveItem,
    type NewLayoutItem,
    removeItem,
    resizeItem,
} from "./layout/edit";
export {
    cellAt,
    columnWidth,
    containerHeight,
    type GridGeometry,
    itemPixels,
    type PixelRect,
    unitsAt,
} from "./layout/geometry";
export {
    type LayoutProblem,
    layoutProblems,
    type NormaliseResult,
    normaliseLayout,
} from "./layout/normalise";
export { resizeRect, sideEdges } from "./layout/resize";
export {
    type Compactor,
    type CompactType,
    type GridRect,
    type Layout,
    type LayoutItem,
    type LayoutRules,
    RESIZE_SIDES,
    type ResizeSide,
} from "./layout/types";

/** The package version, until the first release replaces this placeholder export. */
export const VERSION = "0.0.0";
