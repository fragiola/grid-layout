import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast md:flex-row",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root =
    "min-w-0 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)";

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

/** the log keeps its own scroll: the grid stays in view while it grows */
export const panel = "flex min-h-0 shrink-0 flex-col gap-2 md:w-64";

export const panelHead = "flex items-center justify-between gap-2";

export const panelTitle = cn(
    "text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const filters = "flex flex-wrap gap-x-3 gap-y-1.5 text-xs";

export const filter = "flex items-center gap-1.5";

export const log = "flex max-h-96 min-h-0 flex-col gap-1 overflow-auto text-xs";

export const empty = "text-palette-accent/85";

export const line = cn(
    "grid grid-cols-[auto_1fr] gap-x-2 rounded-(--gl-radius) px-2 py-1",
    "border-(length:--gl-border) border-palette-line",
);

const kinds = {
    command: "palette-blue",
    gesture: "palette-raised",
} as const;

export const kind = (kind: keyof typeof kinds) =>
    cn(
        kinds[kind],
        "row-span-2 self-start rounded bg-palette-soft px-1.5 py-0.5 text-[0.65rem] text-palette-contrast uppercase",
    );

export const name = "font-mono font-semibold";

export const detail = "text-palette-accent/85";
