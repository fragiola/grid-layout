import type {
    DragPreviewState,
    DragSourceState,
    ItemState,
} from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full justify-center overflow-hidden bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const phone = cn(
    "flex h-full w-[360px] max-w-full flex-col overflow-hidden rounded-[28px]",
    "border-(length:--gl-border) border-(--gl-item-line) bg-(--gl-canvas-bg)",
);

/** the grid's part of the phone: it scrolls, the sheet stays at the bottom */
export const screen = "min-h-0 flex-1 overflow-y-auto p-3";

export const root = "min-h-40";

export const item = (state: ItemState) =>
    cn(
        "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none [-webkit-touch-callout:none]",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        !state.dragging &&
            "transition-[transform,width,height,scale] duration-(--gl-motion)",
        state.pressing && "scale-[0.97]",
        state.dragging && "shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-xl font-semibold tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

export const sheet = cn(
    "palette-raised flex shrink-0 flex-col gap-2 rounded-t-[20px] bg-palette-base px-3 pt-2 pb-4 shadow-(--gl-lift-shadow)",
);

export const handle = "mx-auto h-1 w-10 rounded-full bg-palette-line";

/** a row that scrolls sideways; a source itself never scrolls it (its touch is a drag) */
export const shelf = "flex gap-2 overflow-x-auto pb-1";

export const source = (state: DragSourceState) =>
    cn(
        "flex w-28 shrink-0 flex-col gap-0.5 rounded-(--gl-radius) px-3 py-2 select-none [-webkit-touch-callout:none]",
        "border-(length:--gl-border) border-(--gl-item-line) bg-(--gl-canvas-bg)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        (state.dragging || state.grabbed) && "opacity-50",
    );

export const sourceValue = "font-semibold tabular-nums";

export const empty = "py-2 text-xs text-palette-accent/85";

export const preview = (state: DragPreviewState) =>
    cn(
        "palette-raised rounded-(--gl-radius) bg-palette-base px-3 py-2 font-semibold shadow-(--gl-lift-shadow)",
        "border-(length:--gl-border) border-(--gl-item-line)",
        state.over && "opacity-0",
    );
