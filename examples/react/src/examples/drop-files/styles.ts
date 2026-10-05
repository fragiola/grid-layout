import type { ItemState, RootState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center justify-between gap-3";

export const note = "text-palette-accent/85";

/** a file over the grid outlines it; anything else, refused, turns it */
export const root = (state: RootState) =>
    cn(
        "min-h-72 shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)",
        state.dropping &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-dashed",
        state.dropRefused &&
            "palette-danger outline-palette-base cursor-not-allowed",
    );

export const empty =
    "pointer-events-none absolute inset-0 grid place-items-center text-palette-accent/85";

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

export const header = "flex items-center gap-2";

export const icon = "size-4 shrink-0";

export const kind = cn(
    "flex-1 truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const name = "truncate font-semibold";

export const size = "text-xs tabular-nums text-palette-accent/85";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
