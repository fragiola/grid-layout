import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";
import type { Tone } from "./portfolio";

/** Each project's palette: full class names, so Tailwind finds them. */
const TONES: Record<Tone, string> = {
    blue: "palette-blue",
    orange: "palette-orange",
    green: "palette-green",
    purple: "palette-purple",
};

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

const motion = (state: ItemState) =>
    cn(
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

/** pinned: the hero is in the accent palette, contrast text on its base */
export const hero = cn(
    "palette-blue flex flex-col justify-between gap-4 overflow-hidden rounded-(--gl-radius) bg-palette-base p-[calc(var(--gl-item-padding)*2)] text-palette-contrast shadow-(--gl-shadow)",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
);

export const eyebrow =
    "text-xs [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking) opacity-85";

export const intro = "flex flex-col gap-2";

export const name = "text-3xl leading-tight font-semibold";

export const role = "max-w-prose text-sm opacity-90";

export const available =
    "mt-1 w-fit rounded-full border border-current px-2.5 py-0.5 text-xs";

/** a picture fills its tile; the tile's palette colours it */
export const tile = (tone: Tone) => (state: ItemState) =>
    cn(
        TONES[tone],
        "group relative overflow-hidden rounded-(--gl-radius) bg-palette-soft shadow-(--gl-shadow) select-none",
        motion(state),
    );

export const artwork = "absolute inset-0 size-full";

/** each layer of a generated picture, back to front */
export const layers = {
    sky: "fill-palette-soft",
    sun: "fill-palette-base",
    far: "fill-palette-line",
    near: "fill-palette-accent",
} as const;

/** the caption sits on the picture, on a neutral strip that reads in every theme */
export const caption = cn(
    "palette-raised absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 bg-palette-base/90 px-(--gl-item-padding) py-1.5 text-palette-contrast",
);

export const captionTitle = cn(
    "truncate",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const captionText = "truncate pe-3 text-xs text-palette-accent/85";

export const text = (state: ItemState) =>
    cn(
        "group palette-raised flex flex-col gap-2 overflow-hidden rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        motion(state),
    );

export const label = cn(
    "text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const body = "text-sm";

export const link =
    "w-fit text-sm text-(--gl-focus-line) underline underline-offset-2 outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)";

/** in the neutral palette: drawn over the caption strip, in its colours */
export const resizeHandle = cn(
    "palette-raised absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize opacity-0 transition-opacity",
    "group-hover:opacity-100 group-focus-visible:opacity-100 data-resizing:opacity-100",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
