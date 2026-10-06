import type {
    DragPreviewState,
    DragSourceState,
    ItemState,
    RootState,
} from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-col gap-2";

export const buttons = "flex flex-wrap items-center gap-2";

export const note = "text-xs text-palette-accent/85 tabular-nums";

export const history = "flex flex-wrap gap-1.5 text-xs";

export const hint = "text-palette-accent/85";

/** an undone step stays listed, struck through, until a new change drops it */
export const step = cn(
    "rounded-(--gl-radius) border-(length:--gl-border) border-palette-line px-2 py-0.5",
    "data-undone:text-palette-accent/60 data-undone:line-through",
);

export const body = "flex min-h-0 flex-1 gap-3";

export const sidebar = "flex w-32 shrink-0 flex-col gap-3";

/** a source looks like what it brings; touch-action is the package's, the cursor the app's */
export const source = (state: DragSourceState) =>
    cn(
        "palette-raised flex items-center gap-2 rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        (state.dragging || state.grabbed) && "opacity-60",
    );

export const icon = "size-4 shrink-0";

/** the grid's box: narrowed, the grid is under its narrow breakpoint's minimum width */
export const stage = (narrow: boolean) =>
    cn(
        "min-w-0 transition-[width] duration-(--gl-motion)",
        narrow ? "w-80" : "w-full",
    );

/** room below the items to drop into: the root is as tall as its layout otherwise */
export const root = (state: RootState) =>
    cn(
        "min-h-64 rounded-(--gl-radius) bg-(--gl-canvas-bg)",
        state.dropping &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-dashed",
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

export const place = "line-clamp-2 text-xs tabular-nums";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

/** over the grid the placeholder shows where it lands: the card fades */
export const preview = (state: DragPreviewState) =>
    cn(
        "palette-raised flex items-center gap-2 rounded-(--gl-radius) px-3 py-2",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-lift-shadow)",
        state.over && "opacity-50",
    );
