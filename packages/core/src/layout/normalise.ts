// Any layout an app hands in, made valid: checked first (an error names what is wrong instead of
// throwing), then corrected and settled. The corrections follow React Grid Layout's
// correctBounds (react-grid-layout, src/core/layout.ts), Copyright (c) 2016 Samuel Reed, under
// the MIT licence (see the root LICENSE): an item past the last column moves back in, `y:
// Infinity` means "below everything so far" (react-grid-layout#2161), and statics that overlap
// are moved apart, downward. Unlike it, an item left of the first column keeps its width, and
// sizes are brought within the item's own limits.

import { bottom, firstCollision } from "./collision";
import { compactLayout } from "./edit";
import type { Layout, LayoutItem, LayoutRules } from "./types";

/** Why a layout cannot be used. */
export interface LayoutProblem {
    /** the index of the item at fault, or `undefined` for the layout as a whole */
    readonly index: number | undefined;
    readonly message: string;
}

/** A layout made valid, or what makes it invalid. */
export type NormaliseResult =
    | { readonly ok: true; readonly layout: Layout }
    | { readonly ok: false; readonly problems: readonly LayoutProblem[] };

const isCount = (value: unknown, min: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= min;

/** What is wrong with `layout`, if anything: ids, numbers, sizes and limits. */
export function layoutProblems(layout: unknown): LayoutProblem[] {
    if (!Array.isArray(layout)) {
        return [{ index: undefined, message: "a layout is an array of items" }];
    }
    const problems: LayoutProblem[] = [];
    const ids = new Set<string>();
    layout.forEach((item: unknown, index) => {
        const fail = (message: string) => problems.push({ index, message });
        if (typeof item !== "object" || item === null) {
            fail("an item is an object");
            return;
        }
        const { id, x, y, w, h, minW, maxW, minH, maxH } = item as Record<
            string,
            unknown
        >;
        if (typeof id !== "string" || id === "")
            fail("id must be a non-empty string");
        else if (ids.has(id)) fail(`id "${id}" is used twice`);
        else ids.add(id);
        if (!isCount(x, Number.NEGATIVE_INFINITY)) fail("x must be an integer");
        if (
            !isCount(y, Number.NEGATIVE_INFINITY) &&
            y !== Number.POSITIVE_INFINITY
        ) {
            fail("y must be an integer (or Infinity: below everything)");
        }
        if (!isCount(w, 1)) fail("w must be an integer of at least 1");
        if (!isCount(h, 1)) fail("h must be an integer of at least 1");
        for (const [name, limit] of [
            ["minW", minW],
            ["maxW", maxW],
            ["minH", minH],
            ["maxH", maxH],
        ] as const) {
            if (
                limit !== undefined &&
                !isCount(limit, 1) &&
                !(name.startsWith("max") && limit === Number.POSITIVE_INFINITY)
            ) {
                fail(`${name} must be an integer of at least 1`);
            }
        }
    });
    return problems;
}

function within(
    size: number,
    min: number | undefined,
    max: number | undefined,
): number {
    return Math.max(Math.min(size, max ?? Number.POSITIVE_INFINITY), min ?? 1);
}

/**
 * `layout` checked, then corrected and settled: sizes within each item's limits and the grid's
 * columns, every item inside the columns, `y: Infinity` below the items before it, overlapping
 * statics moved apart, then compacted by the rules. Returns the very same layout when it was
 * already valid and settled.
 */
export function normaliseLayout(
    layout: Layout,
    rules: LayoutRules,
): NormaliseResult {
    const problems = layoutProblems(layout);
    if (problems.length > 0) return { ok: false, problems };

    const placed: LayoutItem[] = [];
    let changed = false;
    const corrected = layout.map((item) => {
        const w = Math.min(within(item.w, item.minW, item.maxW), rules.cols);
        const h = within(item.h, item.minH, item.maxH);
        let x = Math.max(0, Math.min(item.x, rules.cols - w));
        let y =
            item.y === Number.POSITIVE_INFINITY
                ? bottom(placed)
                : Math.max(0, item.y);
        let next: LayoutItem = { ...item, x, y, w, h };
        if (item.static) {
            // a static overlapping an earlier static moves down until clear
            const statics = placed.filter((other) => other.static);
            while (firstCollision(statics, next) !== undefined) {
                y += 1;
                next = { ...next, y };
            }
        }
        x = next.x;
        const same =
            x === item.x && y === item.y && w === item.w && h === item.h;
        if (!same) changed = true;
        const result = same ? item : next;
        placed.push(result);
        return result;
    });
    const settled = compactLayout(changed ? corrected : layout, rules);
    return { ok: true, layout: settled };
}
