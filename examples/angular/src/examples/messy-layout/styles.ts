import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex items-center justify-between gap-3";

export const root = "shrink-0 rounded-(--gl-radius) bg-(--gl-canvas-bg)";

export const note = "text-palette-accent/85 tabular-nums";

export const item = cn(
    "palette-raised flex flex-col justify-between overflow-hidden rounded-(--gl-radius) cursor-grab select-none",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
    "transition-[transform,width,height] duration-(--gl-motion) data-dragging:transition-none data-dragging:cursor-grabbing",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
);

export const title = cn(
    "truncate font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const box = "text-xs text-palette-accent/85 tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
