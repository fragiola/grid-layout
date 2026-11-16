import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const sidebar = "flex w-40 shrink-0 flex-col gap-3";

/** a source looks like what it brings; touch-action is the package's, the cursor the app's */
export const source = cn(
    "palette-raised flex items-center gap-2 rounded-(--gl-radius) select-none",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
    "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
    "data-dragging:opacity-60 data-grabbed:opacity-60",
);

export const icon = "size-4 shrink-0";

export const status = "text-palette-accent/85";

export const last = "text-xs tabular-nums";

/** room below the items to drop into: the root is as tall as its layout otherwise */
export const root = cn(
    "min-h-80 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)",
    "data-dropping:outline-(length:--gl-focus-width) data-dropping:outline-(--gl-focus-line) data-dropping:outline-dashed",
);

export const item = cn(
    "palette-raised flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) select-none",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
    "data-draggable:cursor-grab",
    "not-data-dragging:not-data-resizing:transition-[transform,width,height] not-data-dragging:not-data-resizing:duration-(--gl-motion)",
    "data-dragging:cursor-grabbing data-dragging:shadow-(--gl-lift-shadow)",
);

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const body = "line-clamp-3 text-sm";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

/** over the grid the placeholder shows where it lands: the card fades */
export const preview = cn(
    "palette-raised flex items-center gap-2 rounded-(--gl-radius) px-3 py-2",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-lift-shadow)",
    "data-over:opacity-50",
);
