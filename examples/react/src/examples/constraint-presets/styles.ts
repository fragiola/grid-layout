import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center justify-between gap-3";

export const note = "text-palette-accent/85";

export const code = "font-mono text-xs";

/**
 * With autoSize, at least the 8 rows maxRows allows (padding 10, rows 40, gaps 10) so its line
 * shows; for containerBounds, a fixed height of 5 rows: the rows the grid shows are the rule
 */
export const root = (fixed: boolean) =>
    cn(
        "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)",
        fixed ? "h-[260px] overflow-hidden" : "min-h-[410px]",
    );

/** the line under row 8 (padding 10 + 8 rows of 40 + 7 gaps of 10, then half a gap) */
export const maxRows = cn(
    "pointer-events-none absolute inset-x-0 top-[405px] border-t-2 border-dashed border-(--gl-placeholder-line)",
    "px-2 pt-0.5 text-end font-mono text-xs text-palette-accent/85",
);

export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col overflow-hidden rounded-(--gl-radius) select-none",
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

export const value = "font-semibold tabular-nums";

export const place = "truncate text-xs text-palette-accent/85 tabular-nums";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

/** a fieldset: no border or padding of its own */
export const segments = "m-0 flex flex-wrap gap-1 border-0 p-0";

export const option = "flex items-center gap-2";

/** the chosen preset in the accent palette, the others as outlines */
export const segment = (active: boolean) =>
    active ? "palette-blue" : undefined;
