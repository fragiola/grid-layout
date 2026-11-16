import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** no grab cursor on the body: only the grip drags */
export const item = cn(
    "palette-raised flex flex-col gap-1.5 overflow-hidden rounded-(--gl-radius)",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
    "not-data-dragging:transition-[transform,width,height] not-data-dragging:duration-(--gl-motion)",
    "data-dragging:shadow-(--gl-lift-shadow)",
    "data-grabbed:outline-(length:--gl-focus-width) data-grabbed:outline-(--gl-focus-line) data-grabbed:outline-offset-2",
);

export const header = "flex items-center gap-1";

export const handle = cn(
    "grid size-6 shrink-0 place-items-center rounded text-palette-accent/85 [&_svg]:size-4",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
    "data-dragging:cursor-grabbing not-data-dragging:cursor-grab not-data-dragging:hover:bg-palette-soft",
);

export const title = cn(
    "min-w-0 flex-1 truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const value = "text-xl font-semibold tabular-nums";

export const field = cn(
    "w-full rounded border-(length:--gl-border) border-palette-line bg-transparent px-2 py-1",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
);

export const note = "text-xs text-palette-accent/85 tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
