import type { DragSourceState, ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

/** `data-open`: a widget held over it, released, is put away */
export const toolbox = cn(
    "flex min-h-14 flex-wrap items-center gap-2 rounded-(--gl-radius) p-2",
    "border-(length:--gl-placeholder-width) border-(--gl-item-line) [border-style:var(--gl-placeholder-style)]",
    "data-open:border-(--gl-focus-line) data-open:bg-(--gl-placeholder-bg)",
);

export const heading = cn(
    "me-2 text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const empty = "text-palette-accent/85";

export const source = (state: DragSourceState) =>
    cn(
        "palette-raised rounded-(--gl-radius) px-3 py-1.5 select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-shadow)",
        "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        (state.dragging || state.grabbed) && "opacity-50",
    );

/** room to drop a widget back, even with every widget in the toolbox */
export const root =
    "min-h-60 shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** off the grid, the held widget fades: released there it goes to the toolbox, or back */
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
        state.outside && "opacity-60",
    );

export const header = "flex items-center justify-between gap-2";

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-2xl font-semibold tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
