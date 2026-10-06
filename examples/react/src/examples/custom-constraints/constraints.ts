import type { LayoutConstraint } from "@fragiola/grid-layout-react";

// Constraints written by the app. A constraint is a `name` with a `position` rule, a `size` rule
// or both; each receives the item with the proposed place or size already in it, and the grid's
// `cols`, `maxRows`, `layout` and pixels. Whatever it returns, the item stays inside the columns.

/** Items start on an even column (0, 2, 4, …). */
export const evenColumns: LayoutConstraint = {
    name: "evenColumns",
    position: (item) => ({ x: Math.round(item.x / 2) * 2, y: item.y }),
};

/** An item is at least half as tall as it is wide. */
export const minHeightFromWidth: LayoutConstraint = {
    name: "minHeightFromWidth",
    size: (item) => ({ w: item.w, h: Math.max(item.h, Math.ceil(item.w / 2)) }),
};

/** An item covers at most `area` cells: the side being pulled gives way. */
export const maxArea = (area: number): LayoutConstraint => ({
    name: `maxArea(${area})`,
    size: (item, _ctx, side) => {
        if (item.w * item.h <= area) return { w: item.w, h: item.h };
        // a side or corner that pulls the width shortens it; the top or bottom, the height
        return side.includes("start") || side.includes("end")
            ? { w: Math.max(1, Math.floor(area / item.h)), h: item.h }
            : { w: item.w, h: Math.max(1, Math.floor(area / item.w)) };
    },
});

/** Items stay in the top half of `maxRows`. */
export const topHalf: LayoutConstraint = {
    name: "topHalf",
    position: (item, ctx) => ({
        x: item.x,
        y: Math.min(item.y, Math.max(0, Math.floor(ctx.maxRows / 2) - item.h)),
    }),
};
