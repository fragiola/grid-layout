import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const panel = "flex flex-wrap items-start justify-between gap-3";

export const keys = "flex flex-wrap gap-x-4 gap-y-1 text-palette-accent/85";

export const keyRow = "flex items-center gap-1.5";

export const key =
    "rounded border-(length:--gl-border) border-palette-line px-1.5 py-0.5 text-xs";

export const status = "min-h-5 max-w-md text-end";

export const hint = "sr-only";

export const root = "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** a grabbed item wears the focus ring and lifts, so sighted keyboard users see it too */
export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        "transition-[transform,width,height] duration-(--gl-motion)",
        state.grabbed &&
            "shadow-(--gl-lift-shadow) outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-offset-2",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-2xl font-semibold tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
