import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

/** a fieldset: no border or padding of its own */
export const segments = "m-0 flex flex-wrap gap-1 border-0 p-0";

/** the chosen zoom in the accent palette, the others as outlines */
export const segment = (active: boolean) =>
    active ? "palette-blue" : undefined;

/** the window onto the canvas: it scrolls when the zoom draws the canvas larger */
export const viewport = cn(
    "min-h-0 flex-1 overflow-auto rounded-(--gl-radius) bg-palette-soft p-3",
    "border-(length:--gl-border) border-palette-line",
);

/**
 * a sheet that keeps its width at any zoom (the grid's columns do not change), drawn scaled from
 * its start corner
 */
export const canvas = cn(
    "w-[640px] origin-top-left rtl:origin-top-right",
    "rounded-(--gl-radius) bg-palette-base shadow-(--gl-shadow)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        state.draggable && "cursor-grab",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const place = "truncate text-xs text-palette-accent/85 tabular-nums";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
