import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

/** the canvas the items sit on */
export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

export const item = (state: ItemState) =>
    cn(
        "palette-raised grid grid-rows-[auto_auto_1fr] content-start gap-1 overflow-hidden",
        "rounded-(--gl-radius) border-(length:--gl-border) border-(--gl-item-line) bg-palette-base",
        "p-(--gl-item-padding) shadow-(--gl-shadow) outline-none select-none",
        "focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        state.draggable && "cursor-grab",
        // items glide to their new places, but never while the pointer holds one
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-2xl font-semibold tabular-nums";

export const change = (change: number) =>
    cn(
        "text-xs tabular-nums",
        change >= 0 ? "text-(--gl-focus-line)" : "text-palette-accent/85",
    );

/** the sparkline fills what is left of the card */
export const chart =
    "h-full min-h-6 w-full fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

/** a corner the size of a finger's tip, drawn as two short lines */
export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
