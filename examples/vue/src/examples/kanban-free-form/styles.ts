import { cn } from "#/lib/cn";
import type { Tone } from "./notes";

/** Each note colour's palette: full class names, so Tailwind finds them. */
const TONES: Record<Tone, string> = {
    orange: "palette-orange",
    green: "palette-green",
    blue: "palette-blue",
    purple: "palette-purple",
};

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-3";

/** a part's state is on its element (`data-*`): Vue takes a class value, not a function of it */
export const source = cn(
    "palette-orange flex shrink-0 items-center gap-2 rounded-(--gl-radius) select-none",
    "bg-palette-soft px-3 py-2 font-semibold text-palette-accent shadow-(--gl-shadow)",
    "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
    "data-dragging:opacity-50 data-grabbed:opacity-50",
);

export const icon = "size-4 shrink-0";

export const status = "min-w-0 flex-1 text-xs text-palette-accent/85";

/**
 * As tall as the board's 12 rows (36 px rows, 8 px gaps and padding): the grid is only as tall
 * as its lowest note, and the lanes go further. `data-dropping` outlines it while a new note is
 * held over it.
 */
export const root = cn(
    "min-h-[536px] shrink-0 rounded-(--gl-radius) bg-palette-base",
    "data-dropping:outline-(length:--gl-focus-width) data-dropping:outline-(--gl-focus-line) data-dropping:outline-dashed",
);

/**
 * the lanes: the middle one (columns 4 to 7, a cell's `data-x`) a shade lighter, so the three
 * read as columns
 */
export const cell = cn(
    "rounded-[calc(var(--gl-radius)/2)] bg-(--gl-canvas-bg)/75",
    "data-[x=4]:bg-(--gl-canvas-bg)/35 data-[x=5]:bg-(--gl-canvas-bg)/35 data-[x=6]:bg-(--gl-canvas-bg)/35 data-[x=7]:bg-(--gl-canvas-bg)/35",
);

/** pinned: the lane's name and how many notes it holds */
export const lane = cn(
    "palette-raised flex items-center justify-between gap-2 rounded-(--gl-radius) px-(--gl-item-padding)",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-shadow)",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
);

export const laneTitle = cn(
    "truncate",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const laneCount =
    "min-w-6 rounded-full bg-palette-soft px-2 text-center text-xs tabular-nums text-palette-accent";

/** a sticky note: its palette's soft background and accent text, tilted a little while held */
export const note = (tone: Tone) =>
    cn(
        TONES[tone],
        "flex flex-col gap-1 overflow-hidden rounded-(--gl-radius) bg-palette-soft p-2 text-palette-accent select-none",
        "border-(length:--gl-border) border-palette-line shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        "data-draggable:cursor-grab",
        "not-data-dragging:transition-[transform,rotate,box-shadow] not-data-dragging:duration-(--gl-motion)",
        "data-dragging:cursor-grabbing data-dragging:rotate-1 data-dragging:shadow-(--gl-lift-shadow)",
        "data-grabbed:outline-(length:--gl-focus-width) data-grabbed:outline-(--gl-focus-line) data-grabbed:outline-offset-2",
    );

export const noteHeader = "flex items-center gap-0.5";

export const noteTitle = "min-w-0 flex-1 truncate text-xs font-semibold";

/** the text fills the note; typing in it never starts a drag */
export const noteText = cn(
    "min-h-0 w-full flex-1 resize-none rounded bg-transparent p-1 text-sm text-palette-accent placeholder:text-palette-accent/60",
    "outline-none focus-visible:bg-palette-base/40 focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);

/** the card follows the pointer; over the board the placeholder takes over */
export const preview = cn(
    "palette-orange flex items-center gap-2 rounded-(--gl-radius) bg-palette-soft px-3 py-2 font-semibold text-palette-accent shadow-(--gl-lift-shadow)",
    "data-over:opacity-0",
);
