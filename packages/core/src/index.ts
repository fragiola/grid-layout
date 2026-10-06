// @fragiola/grid-layout: the framework-free core of the headless grid layout.

export {
    DRAG_EXEMPT,
    ITEM_ATTRIBUTE,
    NO_DRAG_ATTRIBUTE,
    PART_ATTRIBUTE,
    PRESSING_ATTRIBUTE,
} from "./engine/dom";
export { createGridLayoutEngine } from "./engine/engine";
export {
    type CellState,
    cellPart,
    cellRowCount,
    type DragHandleState,
    type DragPreviewState,
    type DragSourceState,
    dragHandlePart,
    dragPreviewPart,
    dragSourcePart,
    gridCells,
    type ItemState,
    itemPart,
    type Part,
    type PlaceholderState,
    placeholderPart,
    type ResizeHandleState,
    type RootState,
    resizeHandlePart,
    rootPart,
    type StructuralStyle,
} from "./engine/parts";
export type {
    CellRows,
    Direction,
    DropItem,
    EngineActionMap,
    EngineQueryMap,
    EngineQuestionMap,
    ExternalDragAnswer,
    ExternalDrop,
    GestureEvent,
    GestureListener,
    GestureSource,
    GestureView,
    GridCell,
    GridLayoutEngine,
    GridLayoutEngineAdapter,
    GridLayoutEngineOptions,
    GridLayoutView,
    PerBreakpoint,
} from "./engine/types";
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
    aspectRatio,
    boundedX,
    boundedY,
    type ConstraintArg,
    type ConstraintContext,
    type ConstraintEnv,
    type ConstraintFactory,
    type ConstraintRegistry,
    containerBounds,
    defaultConstraints,
    gridBounds,
    type ItemConstraint,
    type LayoutConstraint,
    maxSize,
    minMaxSize,
    minSize,
    sameItemConstraints,
    snapToGrid,
} from "./layout/constraints";
export {
    addItem,
    compactLayout,
    firstFreeCell,
    moveItem,
    type NewLayoutItem,
    placeItem,
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
    type Breakpoints,
    breakpointFor,
    type Generation,
    generateLayout,
    sortBreakpoints,
} from "./layout/responsive";
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
export {
    activeLayout,
    COMMANDS,
    createGridLayoutModel,
    fail,
    rulesOf,
    veto,
} from "./model/model";
export {
    type AtBreakpoint,
    type CommandContext,
    type CommandError,
    type CommandErrorCode,
    type CommandEvent,
    type CommandFailure,
    type CommandListener,
    type CommandMap,
    type CommandName,
    type CommandResult,
    DEFAULT_BREAKPOINT,
    type GridLayoutModel,
    type GridLayoutModelOptions,
    type GridLayoutState,
    type GridSettings,
    type ItemSettings,
    type Middleware,
    type PayloadOf,
    type PlaceResult,
    type QueryKey,
    type QueryMap,
    type QuestionKey,
    type QuestionMap,
    type ResultOf,
    type RunArgs,
    type RunOptions,
} from "./model/types";

/** The package version, until the first release replaces this placeholder export. */
export const VERSION = "0.0.0";
