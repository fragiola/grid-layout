import type { ResizeSide } from "@fragiola/grid-layout-vue";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** `group`: the handles show while the item is hovered or focused */
export const item = cn(
    "group palette-raised flex flex-col items-center justify-center gap-1 rounded-(--gl-radius) select-none",
    "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
    "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
    "not-data-dragging:not-data-resizing:transition-[transform,width,height] not-data-dragging:not-data-resizing:duration-(--gl-motion)",
    "data-dragging:shadow-(--gl-lift-shadow) data-resizing:shadow-(--gl-lift-shadow)",
);

export const title = cn(
    "truncate font-(--gl-title-weight) [text-transform:var(--gl-title-transform)] tracking-(--gl-title-tracking)",
);

export const size = "text-xs text-palette-accent/85 tabular-nums";

/** where each handle sits: logical insets, so right-to-left mirrors them for free */
const PLACES: Record<ResizeSide, string> = {
    top: "inset-x-3 top-0 h-1.5 cursor-ns-resize",
    bottom: "inset-x-3 bottom-0 h-1.5 cursor-ns-resize",
    start: "inset-y-3 start-0 w-1.5 cursor-ew-resize",
    end: "inset-y-3 end-0 w-1.5 cursor-ew-resize",
    "top-start":
        "top-0 start-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize",
    "top-end": "top-0 end-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize",
    "bottom-start":
        "bottom-0 start-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize",
    "bottom-end":
        "bottom-0 end-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize",
};

/** the side is the app's data (a function of it); the resize state is on the element (`data-resizing`) */
export const handle = (side: ResizeSide) =>
    cn(
        "absolute rounded-sm bg-(--gl-handle-color) opacity-0 transition-opacity",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
        "data-resizing:opacity-100 data-resizing:bg-(--gl-focus-line)",
        PLACES[side],
    );

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
