// The app's rules, as plain logic: where items may not go, and how many fit on a row.

import type {
    CommandContext,
    GridRect,
    Layout,
} from "@fragiola/grid-layout-vue";
import { widget } from "../_kit/widgets";

/** The reserved area, in grid units: no item may end up there. */
export const RESERVED: GridRect = { x: 8, y: 0, w: 4, h: 3 };

/** The most widgets one row may hold. */
const PER_ROW = 3;

/** A command that places or sizes an item: the rules read the layout it settles into. */
export type Placing = Extract<
    CommandContext,
    { command: "item.move" | "item.place" | "item.resize" | "item.add" }
>;

/** Whether a command places or sizes an item. */
export const placing = (ctx: CommandContext): ctx is Placing =>
    ctx.command === "item.move" ||
    ctx.command === "item.place" ||
    ctx.command === "item.resize" ||
    ctx.command === "item.add";

/** A refusal: which item, where it was asked to go, and why not. */
export interface Refusal {
    readonly itemId: string;
    readonly where: string;
    readonly reason: string;
}

const overlapsReserved = (box: GridRect) =>
    box.x < RESERVED.x + RESERVED.w &&
    box.x + box.w > RESERVED.x &&
    box.y < RESERVED.y + RESERVED.h &&
    box.y + box.h > RESERVED.y;

/** The item a command names, and where it asks it to go (or what size), in words. */
export function attempt(ctx: Placing): { itemId: string; where: string } {
    const cell = (x: number, y: number) => `to column ${x + 1}, row ${y + 1}`;
    switch (ctx.command) {
        case "item.add": {
            const { item } = ctx.payload;
            return {
                itemId: item.id,
                where: item.x === undefined ? "" : cell(item.x, item.y ?? 0),
            };
        }
        case "item.resize":
            return {
                itemId: ctx.payload.itemId,
                where: `to ${ctx.payload.w} × ${ctx.payload.h}`,
            };
        default:
            return {
                itemId: ctx.payload.itemId,
                where: cell(ctx.payload.x, ctx.payload.y),
            };
    }
}

/** Why a settled layout breaks a rule, or `undefined` when it keeps them all. */
export function broken(layout: Layout): string | undefined {
    const inside = layout.find(overlapsReserved);
    if (inside)
        return `${widget(inside.id).title} would enter the reserved area.`;
    const rows = Math.max(0, ...layout.map((item) => item.y + item.h));
    for (let row = 0; row < rows; row++) {
        const count = layout.filter(
            (item) => item.y <= row && row < item.y + item.h,
        ).length;
        if (count > PER_ROW)
            return `Row ${row + 1} would hold ${count} widgets; ${PER_ROW} at most.`;
    }
    return undefined;
}
