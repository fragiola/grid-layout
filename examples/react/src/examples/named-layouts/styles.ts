import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast md:flex-row",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const panel = "flex shrink-0 flex-col gap-3 md:w-52";

export const panelTitle = cn(
    "text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const form = "flex flex-col gap-1";

export const label = "text-xs text-palette-accent/85";

export const row = "flex gap-2";

export const input = cn(
    "h-8 min-w-0 flex-1 rounded-(--gl-radius) border-(length:--gl-border) border-palette-line bg-palette-base px-2 text-sm text-palette-contrast",
    "placeholder:text-palette-accent/60",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-1",
);

export const list = "flex flex-col gap-1";

export const empty = "text-xs text-palette-accent/85";

export const entry = "flex items-center gap-1";

/** the layout on screen is the named one: aria-pressed says so, the style shows it */
export const name = cn(
    "min-w-0 flex-1 justify-start truncate",
    "aria-pressed:bg-palette-soft aria-pressed:font-semibold aria-pressed:text-palette-contrast",
);

export const status = "min-h-5 text-xs text-palette-accent/85";

export const root =
    "min-w-0 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)";

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

export const value = "text-xl font-semibold tabular-nums";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
