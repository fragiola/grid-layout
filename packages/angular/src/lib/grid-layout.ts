import { GridLayoutCells } from "./directives/cells.directive";
import { GridLayoutDragHandle } from "./directives/drag-handle.directive";
import { GridLayoutDragPreview } from "./directives/drag-preview.directive";
import { GridLayoutDragSource } from "./directives/drag-source.directive";
import { GridLayoutItem } from "./directives/item.directive";
import { GridLayoutItems } from "./directives/items.directive";
import { GridLayoutPlaceholder } from "./directives/placeholder.directive";
import { GridLayoutResizeHandle } from "./directives/resize-handle.directive";
import { GridLayoutRoot } from "./directives/root.directive";

/**
 * Every Grid Layout directive, for a standalone component's `imports` (React's `GridLayout`
 * namespace): `@Component({ imports: [GRID_LAYOUT], … })`.
 */
export const GRID_LAYOUT = [
    GridLayoutRoot,
    GridLayoutItems,
    GridLayoutItem,
    GridLayoutDragHandle,
    GridLayoutResizeHandle,
    GridLayoutPlaceholder,
    GridLayoutCells,
    GridLayoutDragSource,
    GridLayoutDragPreview,
] as const;
