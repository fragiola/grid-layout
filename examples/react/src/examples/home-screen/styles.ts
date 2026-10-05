import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full justify-center overflow-hidden bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const phone = cn(
    "h-full w-[360px] max-w-full overflow-y-auto rounded-[28px]",
    "border-(length:--gl-border) border-(--gl-item-line) bg-(--gl-canvas-bg)",
);

/** `group`: the icons read the root's `data-dragging` (one is moving: the others tilt) */
export const root = "group";

/**
 * an icon tilts while another moves (odd and even the other way: a wiggle), shrinks while held,
 * lifts while it moves. All CSS, over the state the grid sets
 */
export const item = (state: ItemState) =>
    cn(
        "flex flex-col items-center justify-start gap-1.5 select-none [-webkit-touch-callout:none]",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2 rounded-(--gl-radius)",
        // the others tilt (odd one way, even the other), the moving one never
        !state.dragging &&
            "transition-[transform,rotate,scale] duration-(--gl-motion) group-data-dragging:odd:rotate-2 group-data-dragging:even:-rotate-2",
        state.pressing && "scale-90",
        state.dragging && "scale-110",
    );

export const icon = cn(
    "palette-raised grid size-14 place-items-center rounded-2xl bg-palette-base shadow-(--gl-shadow)",
    "border-(length:--gl-border) border-(--gl-item-line)",
);

export const glyph = "size-7";

export const name = "w-full truncate text-center text-xs";

export const placeholder = "rounded-2xl bg-(--gl-placeholder-bg)";
