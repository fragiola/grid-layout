import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** a static reads as fixed: soft, no shadow, no grab cursor */
export const item = (isStatic: boolean | undefined) =>
    cn(
        "flex flex-col justify-between gap-1 overflow-hidden rounded-(--gl-radius) p-(--gl-item-padding) select-none",
        "border-(length:--gl-border) border-(--gl-item-line)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
        // the palette is a class of its own (not a variant): the layout's `static` picks it
        isStatic
            ? "palette-surface bg-palette-soft"
            : "palette-raised cursor-grab bg-palette-base shadow-(--gl-shadow)",
        "not-data-dragging:transition-[transform,width,height] not-data-dragging:duration-(--gl-motion)",
        "data-dragging:cursor-grabbing data-dragging:shadow-(--gl-lift-shadow)",
    );

export const title = cn(
    "flex items-center gap-1.5 truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const pin = "size-3.5 shrink-0";

export const value = "text-2xl font-semibold tabular-nums";

export const note = "text-palette-accent/85";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
