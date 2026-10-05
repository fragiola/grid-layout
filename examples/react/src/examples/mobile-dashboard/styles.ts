import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full justify-center overflow-hidden bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

/** a phone-sized frame that scrolls on its own: the grid's width, never the window's, is narrow */
export const phone = cn(
    "flex h-full w-[360px] max-w-full flex-col gap-3 overflow-y-auto overscroll-contain rounded-[28px] p-3",
    "border-(length:--gl-border) border-(--gl-item-line) bg-(--gl-canvas-bg)",
);

export const hint = "text-center text-xs text-palette-accent/85";

export const root = "shrink-0";

/**
 * a held card says so (a ring, a slight shrink) and lifts once it drags; no long-press callout
 * or text selection on iOS, which is styling and so the app's
 */
export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none [-webkit-touch-callout:none]",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height,scale] duration-(--gl-motion)",
        "data-pressing:scale-[0.97] data-pressing:outline-(length:--gl-focus-width) data-pressing:outline-(--gl-focus-line)",
        state.dragging && "shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-2xl font-semibold tabular-nums";

export const change = "text-xs tabular-nums text-palette-accent/85";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
