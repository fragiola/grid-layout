import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast md:flex-row",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const form = "flex shrink-0 flex-col gap-3 md:w-52";

export const field = "flex flex-col gap-1 text-xs text-palette-accent/85";

const control = cn(
    "h-8 rounded-(--gl-radius) border-(length:--gl-border) border-palette-line bg-palette-base px-2 text-sm text-palette-contrast",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-1",
);

export const select = control;

export const numbers = "grid grid-cols-4 gap-2";

export const number = cn(control, "w-full min-w-0 tabular-nums");

export const buttons = "flex flex-wrap gap-2";

export const danger = "palette-danger";

export const status = "min-h-10 text-xs text-palette-accent/85";

export const root =
    "min-w-0 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)";

export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        state.draggable && "cursor-grab",
        state.static && "bg-palette-soft",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const place = "truncate text-xs tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
