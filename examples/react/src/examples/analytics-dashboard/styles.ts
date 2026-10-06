import type { DragHandleState, ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-3";

export const heading = cn(
    "text-base",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

/** pushes the reset to the end of the toolbar */
export const status = "min-w-0 flex-1 truncate text-xs text-palette-accent/85";

export const root = "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** no grab cursor on the body: only the header's grip drags */
export const item = (state: ItemState) =>
    cn(
        "group palette-raised flex flex-col gap-2 overflow-hidden rounded-(--gl-radius)",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        (state.dragging || state.resizing) && "shadow-(--gl-lift-shadow)",
        state.grabbed &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-offset-2",
    );

export const header = "flex min-h-7 items-center justify-between gap-2";

/** the grip and the title together: the widget moves by its whole title */
export const handle = (state: DragHandleState) =>
    cn(
        "-ms-1 flex min-w-0 items-center gap-1 rounded px-1 py-0.5 select-none",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
        state.dragging
            ? "cursor-grabbing"
            : "cursor-grab hover:bg-palette-soft",
    );

export const grip = "size-4 shrink-0 text-palette-accent/85";

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const figure = "flex min-w-0 items-baseline gap-2";

export const value =
    "truncate text-2xl font-semibold whitespace-nowrap tabular-nums";

/** up in the focus colour, down in the secondary text: the sign says it, not the colour */
export const change = (change: number) =>
    cn(
        "truncate text-xs tabular-nums",
        change >= 0 ? "text-(--gl-focus-line)" : "text-palette-accent/85",
    );

/** the sparkline fills what is left of the tile */
export const sparkline =
    "min-h-4 w-full flex-1 fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

export const chart = "min-h-10 w-full flex-1";

export const area = "fill-(--gl-placeholder-bg) stroke-none";

export const line =
    "fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

export const axis = "flex justify-between text-xs text-palette-accent/85";

/** a fieldset: no border or padding of its own */
export const segments = "m-0 flex shrink-0 gap-1 border-0 p-0";

/** the chosen range in the accent palette, the others as outlines */
export const segment = (active: boolean) =>
    active ? "palette-blue" : undefined;

export const select = cn(
    "shrink-0 rounded border-(length:--gl-border) border-palette-line bg-palette-base px-1.5 py-0.5 text-xs text-palette-contrast",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
);

export const bars =
    "m-0 flex min-h-0 flex-1 list-none flex-col justify-around gap-1 p-0";

export const bar =
    "grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-xs";

export const barName = "truncate";

export const track = "h-2 overflow-hidden rounded-full bg-palette-soft";

/** its width is the value's share of the largest (inline, from the data) */
export const fill =
    "block h-full rounded-full bg-(--gl-focus-line) transition-[inline-size] duration-(--gl-motion)";

export const barValue = "text-end tabular-nums";

/** a table taller than its widget scrolls inside it */
export const scroll = "min-h-0 flex-1 overflow-auto";

export const table = "w-full border-collapse text-xs";

export const th = "pb-1 text-start font-medium text-palette-accent/85";

export const thEnd = "pb-1 text-end font-medium text-palette-accent/85";

export const row = "border-t border-palette-line";

export const path = "truncate py-1 font-mono";

export const number = "py-1 text-end tabular-nums";

export const cellChange = (change: number) =>
    cn(
        "py-1 text-end text-xs tabular-nums",
        change >= 0 ? "text-(--gl-focus-line)" : "text-palette-accent/85",
    );

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize opacity-0 transition-opacity",
    "group-hover:opacity-100 group-focus-within:opacity-100 data-resizing:opacity-100",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
