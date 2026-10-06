import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";
import type { Tone } from "./photos";

/** Each photo's palette: full class names, so Tailwind finds them. */
const TONES: Record<Tone, string> = {
    blue: "palette-blue",
    orange: "palette-orange",
    green: "palette-green",
    purple: "palette-purple",
    danger: "palette-danger",
};

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-3";

export const heading = cn(
    "text-base",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

/** pushes Shuffle to the end of the toolbar */
export const count = "flex-1 text-xs text-palette-accent/85";

export const root = "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** a photo fills its tile; the tile's palette colours it; it glides to its place in the flow */
export const photo = (tone: Tone) => (state: ItemState) =>
    cn(
        TONES[tone],
        "group relative overflow-hidden rounded-(--gl-radius) bg-palette-soft shadow-(--gl-shadow) select-none",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        state.draggable && "cursor-grab",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        (state.dragging || state.resizing) && "shadow-(--gl-lift-shadow)",
        state.dragging && "cursor-grabbing",
        state.grabbed &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-offset-2",
    );

export const artwork = "absolute inset-0 size-full";

/** each layer of a generated picture, back to front */
export const layers = {
    sky: "fill-palette-soft",
    sun: "fill-palette-base",
    far: "fill-palette-line",
    near: "fill-palette-accent",
} as const;

/** on a neutral strip, so it reads on any picture in any theme */
export const caption = cn(
    "palette-raised absolute start-2 bottom-2 max-w-[calc(100%-2.5rem)] truncate rounded-(--gl-radius) bg-palette-base/90 px-2 py-0.5 text-xs text-palette-contrast",
);

/** in the neutral palette, so its colour reads on the picture */
export const resizeHandle = cn(
    "palette-raised absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize opacity-0 transition-opacity",
    "group-hover:opacity-100 group-focus-visible:opacity-100 data-resizing:opacity-100",
    "after:absolute after:end-1 after:bottom-1 after:size-3 after:rounded-sm after:border-e-2 after:border-b-2 after:border-(--gl-handle-color) after:bg-palette-base/90",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
