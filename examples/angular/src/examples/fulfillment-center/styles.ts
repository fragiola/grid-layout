import { cn } from "#/lib/cn";

// The same file in the React, Vue and Angular examples: the grid's state is styled through its
// `data-*` attributes, never through a function of the state, so it is copied as is.

/** Each status's palette: full class names, so Tailwind finds them. */
const TONES = {
    info: "palette-blue",
    warning: "palette-orange",
    critical: "palette-danger",
    "on-track": "palette-green",
    "at-risk": "palette-orange",
    breach: "palette-danger",
    empty: "",
    waiting: "palette-orange",
    loading: "palette-blue",
    departing: "palette-green",
} as const;

type Tone = keyof typeof TONES;

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

const card = cn(
    "palette-raised overflow-hidden rounded-(--gl-radius)",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base shadow-(--gl-shadow)",
);

/** the pinned header: no grip, nothing moves it */
export const topBar = cn(
    card,
    "flex flex-wrap items-center gap-x-3 gap-y-1 px-(--gl-item-padding) py-2",
);

export const brandIcon = "size-5 shrink-0 text-(--gl-focus-line)";

export const brand = "flex min-w-0 flex-1 flex-col";

export const heading = cn(
    "truncate text-sm",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const site = "truncate text-xs text-palette-accent/85";

export const clock = "shrink-0 font-mono text-sm tabular-nums";

/** a dot and a word: the feed's state never relies on the dot's colour alone */
export const live = (playing: boolean) =>
    cn(
        "flex shrink-0 items-center gap-1.5 text-xs",
        playing
            ? "palette-green text-palette-accent"
            : "text-palette-accent/85",
        "before:size-2 before:rounded-full before:bg-current",
    );

export const playIcon = "size-4";

/** a widget: no grab cursor on the body, only the header's grip drags */
export const item = cn(
    card,
    "group flex flex-col gap-2 p-(--gl-item-padding)",
    "not-data-dragging:not-data-resizing:transition-[transform,width,height] not-data-dragging:not-data-resizing:duration-(--gl-motion)",
    "data-dragging:shadow-(--gl-lift-shadow) data-resizing:shadow-(--gl-lift-shadow)",
    "data-grabbed:outline-(length:--gl-focus-width) data-grabbed:outline-(--gl-focus-line) data-grabbed:outline-offset-2",
);

/** along the top of the alerts tile while a critical alert waits: a stripe in the danger palette */
export const criticalStripe =
    "palette-danger absolute inset-x-0 top-0 h-1 bg-palette-base";

export const header =
    "flex min-h-7 shrink-0 items-center justify-between gap-2";

/** the grip and the title together: the widget moves by its whole title */
export const handle = cn(
    "-ms-1 flex min-w-0 items-center gap-1 rounded px-1 py-0.5 select-none",
    "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line)",
    "cursor-grab not-data-dragging:hover:bg-palette-soft data-dragging:cursor-grabbing",
);

export const grip = "size-4 shrink-0 text-palette-accent/85";

export const title = cn(
    "truncate text-palette-accent/85",
    "font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const aside =
    "shrink-0 truncate text-xs text-palette-accent/85 tabular-nums";

export const figure = "flex min-w-0 items-baseline gap-2";

export const value =
    "truncate text-2xl font-semibold whitespace-nowrap tabular-nums";

/** up in the focus colour, down in the secondary text: the sign says it, not the colour */
export const delta = (change: number) =>
    cn(
        "truncate text-xs tabular-nums",
        change >= 0 ? "text-(--gl-focus-line)" : "text-palette-accent/85",
    );

/** the sparkline fills what is left of the tile */
export const sparkline =
    "min-h-3 w-full flex-1 fill-none stroke-(--gl-focus-line) stroke-2 [vector-effect:non-scaling-stroke]";

/** what a chart measures: it takes what is left of its tile, the chart drawn at its size */
export const chartBox = "relative min-h-16 flex-1 overflow-hidden";

/** placed over its measured box, so its own size never feeds back into the measure */
export const chart = "absolute inset-0 overflow-visible";

export const guide = "stroke-palette-line [stroke-dasharray:2_3]";

export const guideLabel =
    "fill-palette-accent/85 text-[0.625rem] tabular-nums [text-anchor:end] [dominant-baseline:middle]";

export const area = "fill-(--gl-placeholder-bg) stroke-none";

export const line =
    "fill-none stroke-(--gl-focus-line) stroke-2 [stroke-linejoin:round]";

/** the second line: dashed and in the text colour, told apart without colour */
export const secondLine =
    "fill-none stroke-palette-contrast/70 stroke-[1.5] [stroke-dasharray:5_3] [stroke-linejoin:round]";

export const column = "fill-(--gl-focus-line) opacity-80";

/** the latest column: full strength, the others fade */
export const lastColumn = "fill-(--gl-focus-line)";

export const legend =
    "flex shrink-0 flex-wrap gap-x-3 text-xs text-palette-accent/85";

export const legendItem = "flex items-center gap-1.5";

export const legendLine = "h-0.5 w-4 bg-(--gl-focus-line)";

export const legendDashed =
    "h-0 w-4 border-t-2 border-dashed border-palette-contrast/70";

export const doors =
    "m-0 grid min-h-0 flex-1 list-none auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 overflow-auto p-0";

/** a door in its state's palette; a free door has none */
export const door = (status: Tone) =>
    cn(
        TONES[status],
        "flex min-w-0 flex-col gap-1 rounded-(--gl-radius) border-(length:--gl-border) border-palette-line bg-palette-soft px-2 py-1.5",
    );

export const doorTop = "flex items-center justify-between gap-1 text-xs";

export const doorName = "font-semibold";

export const doorStatus = "flex items-center gap-1 text-palette-accent";

export const truck = "size-3.5 shrink-0";

export const doorBottom = "flex items-baseline justify-between gap-1";

export const carrierName = "truncate text-[0.6875rem] text-palette-accent/85";

export const load = "shrink-0 text-[0.6875rem] tabular-nums";

export const track = "h-1.5 overflow-hidden rounded-full bg-palette-base";

/** its width is the truck's load (inline, from the data) */
export const fill =
    "block h-full rounded-full bg-palette-accent transition-[inline-size] duration-(--gl-motion)";

/** a table taller than its widget scrolls inside it */
export const scroll = "min-h-0 flex-1 overflow-auto";

export const table = "w-full border-collapse text-xs";

export const th = "pb-1 text-start font-medium text-palette-accent/85";

export const thEnd = "pb-1 text-end font-medium text-palette-accent/85";

export const row = "border-t border-palette-line";

export const cell = "truncate py-1";

export const number = "py-1 text-end tabular-nums";

export const badge = (status: Tone) =>
    cn(
        TONES[status],
        "inline-flex items-center gap-1 rounded-full bg-palette-soft px-1.5 text-[0.6875rem] whitespace-nowrap text-palette-accent",
    );

export const badgeIcon = "size-3 shrink-0";

/** the unacknowledged critical alert, above the feed */
export const critical = cn(
    "palette-danger flex shrink-0 flex-col gap-2 rounded-(--gl-radius) border-(length:--gl-border) border-palette-line bg-palette-soft p-2 text-palette-accent",
);

export const criticalTitle = "flex items-center gap-1.5 text-xs font-semibold";

export const criticalIcon = "size-4 shrink-0";

export const criticalMessage = "text-sm text-palette-accent";

export const acknowledge = "self-start";

export const alerts =
    "m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-auto p-0";

/** an acknowledged alert fades: it stays in the feed, read */
export const alert = (acknowledged: boolean) =>
    cn(
        "grid grid-cols-[auto_1fr_auto] items-start gap-2 border-t border-palette-line pt-1 text-xs first:border-t-0 first:pt-0",
        acknowledged && "opacity-60",
    );

export const alertMessage = "min-w-0";

export const alertTime =
    "font-mono text-[0.6875rem] text-palette-accent/85 tabular-nums";

export const resizeHandle = cn(
    "absolute end-0 bottom-0 size-(--gl-handle-size) cursor-se-resize rtl:cursor-sw-resize opacity-0 transition-opacity",
    "group-hover:opacity-100 group-focus-within:opacity-100 data-resizing:opacity-100",
    "after:absolute after:end-1 after:bottom-1 after:size-1.5 after:border-e-2 after:border-b-2 after:border-(--gl-handle-color)",
);

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
    "transition-transform duration-(--gl-motion)",
);
