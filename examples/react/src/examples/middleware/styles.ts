import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast md:flex-row",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root =
    "min-w-0 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** the reserved area: a picture of the rule, placed by the example, never a part */
export const reserved = cn(
    "pointer-events-none absolute rounded-(--gl-radius) p-2 text-xs text-palette-accent/85",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) border-dashed",
    "bg-[repeating-linear-gradient(135deg,transparent_0_8px,var(--gl-placeholder-bg)_8px_16px)]",
);

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

export const panel = "flex shrink-0 flex-col gap-2 md:w-56";

export const panelTitle = cn(
    "text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const log = "flex flex-col gap-2 text-xs";

export const empty = "text-palette-accent/85";

export const line = cn(
    "palette-danger flex flex-col gap-0.5 rounded-(--gl-radius) px-2 py-1.5",
    "border-(length:--gl-border) border-palette-line bg-palette-soft text-palette-contrast",
);

export const lineHead = "font-semibold";
