import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/**
 * At rest the card glides (the transition is off while held, or it would lag the pointer). Held,
 * it lifts and tilts with `rotate` and `scale`, which compose with the engine's `transform`.
 */
export const item = (state: ItemState) =>
    cn(
        "group palette-raised grid grid-rows-[auto_auto_1fr] gap-1 overflow-hidden rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-within:outline-(length:--gl-focus-width) focus-within:outline-(--gl-focus-line) focus-within:outline-offset-2",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height,rotate,scale,box-shadow] duration-(--gl-motion) ease-out",
        state.dragging && "scale-[1.02] rotate-1 shadow-(--gl-lift-shadow)",
        state.resizing && "shadow-(--gl-lift-shadow)",
    );

export const header = "flex items-center justify-between gap-2";

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

/** the grip shows on hover and focus; it is the card's tab stop */
export const grip = cn(
    "grid size-6 place-items-center rounded text-palette-accent/85 opacity-0 transition-opacity [&_svg]:size-4",
    "cursor-grab group-hover:opacity-100 focus-visible:opacity-100 outline-none",
    "data-dragging:cursor-grabbing data-dragging:opacity-100",
);

export const figure = "flex min-w-0 items-baseline gap-2";

export const value =
    "truncate text-2xl font-semibold whitespace-nowrap tabular-nums";

export const change = (change: number) =>
    cn(
        "text-xs tabular-nums",
        change >= 0 ? "text-(--gl-focus-line)" : "text-palette-accent/85",
    );

export const chart = "h-full min-h-6 w-full";

export const area = "fill-(--gl-placeholder-bg) stroke-none";

export const line =
    "fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

export const corner = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize opacity-0 transition-opacity",
    "group-hover:opacity-100 data-resizing:opacity-100",
    "after:absolute after:end-1 after:bottom-1 after:size-2 after:rounded-ee-sm after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

/** stripes in the theme's placeholder colour */
export const placeholder = cn(
    "rounded-(--gl-radius) border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "bg-[repeating-linear-gradient(135deg,var(--gl-placeholder-bg)_0_8px,transparent_8px_16px)]",
    "transition-transform duration-(--gl-motion) ease-out",
);
