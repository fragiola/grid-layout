import type { ItemState } from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

/** Each status's palette: full class names, so Tailwind finds them. */
const TONES = {
    ok: "palette-green",
    warn: "palette-orange",
    down: "palette-danger",
} as const;

type Status = keyof typeof TONES;

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

const card = cn(
    "palette-raised overflow-hidden rounded-(--gl-radius)",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-shadow)",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
);

/** pinned: no grab cursor, nothing moves it */
export const titleBar = cn(
    card,
    "flex items-center gap-2 px-(--gl-item-padding)",
);

export const icon = "size-4 shrink-0 text-(--gl-focus-line)";

export const heading = cn(
    "text-sm",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const meta = "truncate text-xs text-palette-accent/85";

export const updated =
    "ms-auto shrink-0 text-xs text-palette-accent/85 tabular-nums";

export const summary = cn(card, "grid grid-cols-3 gap-2 p-2");

/** a count in its status's palette, soft background and accent text */
export const count = (status: Status) =>
    cn(
        TONES[status],
        "flex min-w-0 items-center gap-2 rounded-(--gl-radius) bg-palette-soft px-3 text-palette-accent",
    );

export const countIcon = "size-5 shrink-0";

export const countValue = "text-2xl font-semibold tabular-nums";

export const countLabel = "truncate text-xs";

/** a dense tile: half the theme's padding, the status stripe along its start edge */
export const tile = (state: ItemState) =>
    cn(
        card,
        "relative flex flex-col justify-between gap-0.5 select-none",
        "py-[calc(var(--gl-item-padding)/2)] ps-[calc(var(--gl-item-padding)/2+4px)] pe-[calc(var(--gl-item-padding)/2)]",
        state.draggable && "cursor-grab",
        !state.dragging &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
        state.grabbed &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-offset-2",
    );

export const stripe = (status: Status) =>
    cn(TONES[status], "absolute inset-y-0 start-0 w-1 bg-palette-base");

export const name = "truncate text-xs font-semibold";

export const badge = (status: Status) =>
    cn(
        TONES[status],
        "flex w-fit max-w-full items-center gap-1 truncate rounded-full bg-palette-soft px-1.5 text-[0.6875rem] text-palette-accent",
    );

export const badgeIcon = "size-3 shrink-0";

export const metrics =
    "truncate text-[0.6875rem] text-palette-accent/85 tabular-nums";

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
