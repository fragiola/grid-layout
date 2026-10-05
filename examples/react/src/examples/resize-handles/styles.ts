import type {
    ItemState,
    ResizeHandleState,
    ResizeSide,
} from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const root = "rounded-(--gl-radius) bg-(--gl-canvas-bg)";

/** `group`: the handles show while the item is hovered or focused */
export const item = (state: ItemState) =>
    cn(
        "group palette-raised flex flex-col items-center justify-center gap-1 rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        (state.dragging || state.resizing) && "shadow-(--gl-lift-shadow)",
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

export const handle = (side: ResizeSide) => (state: ResizeHandleState) =>
    cn(
        "absolute rounded-sm bg-(--gl-handle-color) opacity-0 transition-opacity",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
        state.resizing && "opacity-100 bg-(--gl-focus-line)",
        PLACES[side],
    );

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
