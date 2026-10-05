import type {
    DragPreviewState,
    DragSourceState,
    ItemState,
    RootState,
} from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const sidebar = "flex w-44 shrink-0 flex-col gap-2";

export const heading = cn(
    "text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const source = (state: DragSourceState) =>
    cn(
        "palette-raised flex flex-col gap-0.5 rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base px-3 py-2 shadow-(--gl-shadow)",
        "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        (state.dragging || state.grabbed) && "opacity-50",
    );

export const sourceTitle = "font-semibold";

export const sourceText = "text-xs text-palette-accent/85";

/** `data-open`: a widget held over it, released, is removed */
export const trash = cn(
    "flex min-h-16 items-center justify-center gap-2 rounded-(--gl-radius) p-2 text-xs text-palette-accent/85",
    "border-(length:--gl-placeholder-width) border-(--gl-item-line) [border-style:var(--gl-placeholder-style)]",
    "data-open:palette-danger data-open:border-palette-base data-open:text-palette-contrast",
);

export const icon = "size-4 shrink-0";

export const status = "min-h-10 text-xs";

/** room below the items to drop into */
export const root = (state: RootState) =>
    cn(
        "min-h-[30rem] flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)",
        state.dropping &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-dashed",
    );

/** off the grid, the held widget fades: released over the trash it goes */
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

export const kpi = "flex items-baseline gap-2";

export const value = "text-2xl font-semibold tabular-nums";

export const change = "text-xs tabular-nums text-(--gl-focus-line)";

/** the sparkline fills what is left of the card */
export const chart =
    "min-h-6 w-full flex-1 fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

export const table = "w-full text-xs tabular-nums";

export const row = "border-t border-palette-line";

export const total = "text-end";

export const note = "line-clamp-4 text-sm";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

/** the card follows the pointer; over the grid the placeholder takes over */
export const preview = (state: DragPreviewState) =>
    cn(
        "palette-raised rounded-(--gl-radius) px-3 py-2 font-semibold",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-lift-shadow)",
        state.over && "opacity-0",
    );
