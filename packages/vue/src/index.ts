// @fragiola/grid-layout-vue: composable, unstyled Vue primitives over @fragiola/grid-layout.

export * from "@fragiola/grid-layout";
export type {
    CellsProps,
    CellsSlots,
} from "./components/cells";
export type {
    DragHandleProps,
    DragHandleSlots,
} from "./components/drag-handle";
export type {
    DragPreviewProps,
    DragPreviewSlots,
} from "./components/drag-preview";
export type {
    DragSourceProps,
    DragSourceSlots,
} from "./components/drag-source";
export type { ItemProps, ItemSlots } from "./components/item";
export type { ItemsProps, ItemsSlots } from "./components/items";
export type {
    PlaceholderProps,
    PlaceholderSlots,
} from "./components/placeholder";
export type {
    ResizeHandleProps,
    ResizeHandleSlots,
} from "./components/resize-handle";
export type { RootProps, RootSlots } from "./components/root";
export { useBreakpoint } from "./composables/use-breakpoint";
export { type CellHookResult, useCells } from "./composables/use-cells";
export { useDragHandle } from "./composables/use-drag-handle";
export {
    type DragPreviewHookResult,
    useDragPreview,
} from "./composables/use-drag-preview";
export {
    type DragSourceHookResult,
    type DragSourceOptions,
    useDragSource,
} from "./composables/use-drag-source";
export { useGesture } from "./composables/use-gesture";
export { useGridLayout } from "./composables/use-grid-layout";
export { useGridLayoutEvents } from "./composables/use-grid-layout-events";
export { useGridLayoutRef } from "./composables/use-grid-layout-ref";
export { useGridLayoutView } from "./composables/use-grid-layout-view";
export {
    type PartHookResult,
    type PartProps,
    useItem,
} from "./composables/use-item";
export { useItems } from "./composables/use-items";
export {
    type PlaceholderHookResult,
    usePlaceholder,
} from "./composables/use-placeholder";
export { useResizeHandle } from "./composables/use-resize-handle";
export {
    type GridLayoutContextValue,
    GridLayoutKey,
} from "./context";
export * as GridLayout from "./parts";
export {
    Cells,
    DragHandle,
    DragPreview,
    DragSource,
    Item,
    Items,
    Placeholder,
    ResizeHandle,
    Root,
} from "./parts";
export type {
    GridLayoutComponent,
    PrimitiveProps,
    SlotFunction,
} from "./utils/primitive";
export type {
    AsProp,
    ElementRef,
    RenderSlot,
    RenderSlotProps,
} from "./utils/render";
