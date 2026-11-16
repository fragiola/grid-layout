// @fragiola/grid-layout-angular: composable, unstyled Angular directives over @fragiola/grid-layout.
// The whole core, so that an Angular app installs and imports one package. A local export would
// silently shadow a core name of the same spelling: tests/exports.test.ts fails on one.

export * from "@fragiola/grid-layout";
export {
    type CellsContext,
    GridLayoutCells,
} from "./lib/directives/cells.directive";
export { GridLayoutDragHandle } from "./lib/directives/drag-handle.directive";
export { GridLayoutDragPreview } from "./lib/directives/drag-preview.directive";
export { GridLayoutDragSource } from "./lib/directives/drag-source.directive";
export { GridLayoutItem } from "./lib/directives/item.directive";
export {
    GridLayoutItems,
    type ItemsContext,
} from "./lib/directives/items.directive";
export { GridLayoutPlaceholder } from "./lib/directives/placeholder.directive";
export { GridLayoutResizeHandle } from "./lib/directives/resize-handle.directive";
export {
    type AutoScrollInput,
    type BreakpointChange,
    GridLayoutRoot,
} from "./lib/directives/root.directive";
export { GRID_LAYOUT } from "./lib/grid-layout";
export { injectBreakpoint } from "./lib/inject/inject-breakpoint";
export { injectCells } from "./lib/inject/inject-cells";
export { injectDragPreview } from "./lib/inject/inject-drag-preview";
export { injectGesture } from "./lib/inject/inject-gesture";
export { injectGridLayout } from "./lib/inject/inject-grid-layout";
export { injectGridLayoutEvents } from "./lib/inject/inject-grid-layout-events";
export { injectGridLayoutView } from "./lib/inject/inject-grid-layout-view";
export { injectItems } from "./lib/inject/inject-items";
export {
    type InjectPartResult,
    injectDragHandle,
    injectDragSource,
    injectItem,
    injectResizeHandle,
} from "./lib/inject/inject-part";
export { injectPlaceholder } from "./lib/inject/inject-placeholder";
export type { PartContext } from "./lib/utils/views";
