import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** sticky notes: a warm palette, a slight tilt at rest */
export const item = cn(
    "palette-orange flex items-start rounded-(--gl-radius) bg-palette-soft p-(--gl-item-padding) select-none",
    "font-(--gl-title-weight) text-palette-contrast shadow-(--gl-shadow) cursor-grab",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
    "not-data-dragging:not-data-resizing:transition-[transform,width,height] not-data-dragging:not-data-resizing:duration-(--gl-motion)",
    "data-dragging:cursor-grabbing data-dragging:shadow-(--gl-lift-shadow)",
);

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);
