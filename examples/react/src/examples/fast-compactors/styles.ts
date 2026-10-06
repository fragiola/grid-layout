import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-3";

/** a fieldset: no border or padding of its own */
export const segments = "m-0 flex flex-wrap gap-1 border-0 p-0";

/** the chosen compactor in the accent palette, the others as outlines */
export const segment = (active: boolean) =>
    active ? "palette-blue" : undefined;

export const timing = "ms-auto flex items-center gap-2 text-palette-accent/85";

/** a fixed width: the toolbar does not jump as the figure changes */
export const ms =
    "min-w-16 text-end font-semibold text-palette-contrast tabular-nums";

export const root = "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** a plain tile: no transition, no shadow, a thousand of them stay cheap to paint */
export const item = (state: ItemState) =>
    cn(
        "palette-blue rounded-[2px] bg-palette-soft select-none",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
        state.draggable && "cursor-grab",
        state.dragging && "cursor-grabbing bg-palette-base",
    );

export const placeholder = "rounded-[2px] bg-(--gl-placeholder-bg)";
