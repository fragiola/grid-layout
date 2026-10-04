import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** sticky notes: a warm palette, a slight tilt at rest */
export const item = (state: ItemState) =>
    cn(
        "palette-orange flex items-start rounded-(--gl-radius) bg-palette-soft p-(--gl-item-padding) select-none",
        "font-(--gl-title-weight) text-palette-contrast shadow-(--gl-shadow) cursor-grab",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
    );

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);
