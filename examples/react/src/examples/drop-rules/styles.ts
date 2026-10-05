import type {
    DragSourceState,
    ItemState,
    RootState,
} from "@fragiola/grid-layout-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full gap-3 overflow-auto bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--gl-font) text-(length:--gl-font-size)",
);

export const sidebar = "flex w-40 shrink-0 flex-col gap-2";

export const source = (state: DragSourceState) =>
    cn(
        "palette-raised flex flex-col gap-0.5 rounded-(--gl-radius) select-none",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base px-3 py-2 shadow-(--gl-shadow)",
        "cursor-grab outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        (state.dragging || state.grabbed) && "opacity-50",
    );

export const sourceTitle = "font-semibold";

export const sourceText = "text-xs text-palette-accent/85";

export const verdict = "min-h-10 text-xs";

/** refused, the grid says so: the placeholder is gone, the outline turns */
export const root = (state: RootState) =>
    cn(
        "min-h-80 flex-1 self-start rounded-(--gl-radius) bg-(--gl-canvas-bg)",
        state.dropping &&
            "outline-(length:--gl-focus-width) outline-(--gl-focus-line) outline-dashed",
        state.dropRefused &&
            "palette-danger outline-palette-base cursor-not-allowed",
    );

/** the last three of twelve columns, from the inline end, under the items */
export const locked = cn(
    "pointer-events-none absolute inset-y-0 end-0 w-1/4 rounded-e-(--gl-radius) p-2 text-xs",
    "bg-[repeating-linear-gradient(135deg,transparent_0_8px,var(--gl-placeholder-bg)_8px_16px)] text-palette-accent/85",
);

export const item = (state: ItemState) =>
    cn(
        "palette-raised flex items-center justify-center overflow-hidden rounded-(--gl-radius) select-none capitalize",
        "border-(length:--gl-border) border-(--gl-item-line) bg-palette-base p-(--gl-item-padding) shadow-(--gl-shadow)",
        "outline-none focus-visible:outline-(length:--gl-focus-width) focus-visible:outline-(--gl-focus-line) focus-visible:outline-offset-2",
        state.draggable && "cursor-grab",
        !state.dragging &&
            !state.resizing &&
            "transition-[transform,width,height] duration-(--gl-motion)",
        state.dragging && "cursor-grabbing shadow-(--gl-lift-shadow)",
    );

export const placeholder = cn(
    "rounded-(--gl-radius) bg-(--gl-placeholder-bg)",
    "border-(length:--gl-placeholder-width) border-(--gl-placeholder-line) [border-style:var(--gl-placeholder-style)]",
);
