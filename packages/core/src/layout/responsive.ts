// Breakpoints by width, and the layout of a breakpoint that has none yet. The generation follows
// React Grid Layout's findOrGenerateResponsiveLayout (react-grid-layout, src/core/responsive.ts),
// Copyright (c) 2016 Samuel Reed, under the MIT licence (see the root LICENSE): the nearest larger
// breakpoint's layout, else the last active one, brought within the new columns and settled, so a
// gap in the source collapses (react-grid-layout#1744). Unlike it, the breakpoint for a width is
// the largest whose minimum is at most the width (React Grid Layout's must be exceeded), and the
// items follow the last active breakpoint's: every breakpoint shows the same items.

import { bottom } from "./collision";
import { normaliseLayout } from "./normalise";
import type { Layout, LayoutItem, LayoutRules } from "./types";

/** Each breakpoint's minimum width, in pixels: `{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`. */
export type Breakpoints = Readonly<Record<string, number>>;

/** The breakpoints' names, from the narrowest to the widest. */
export function sortBreakpoints(breakpoints: Breakpoints): string[] {
    return Object.keys(breakpoints).sort(
        (a, b) => (breakpoints[a] ?? 0) - (breakpoints[b] ?? 0),
    );
}

/**
 * The breakpoint for a width: the widest whose minimum is at most `width`, else the narrowest.
 * `undefined` only without breakpoints.
 */
export function breakpointFor(
    breakpoints: Breakpoints,
    width: number,
): string | undefined {
    const sorted = sortBreakpoints(breakpoints);
    let found = sorted[0];
    for (const name of sorted) {
        if ((breakpoints[name] ?? 0) <= width) found = name;
    }
    return found;
}

/** What generating a breakpoint's layout reads. */
export interface Generation {
    readonly layouts: Readonly<Record<string, Layout>>;
    readonly breakpoints: Breakpoints;
    /** the breakpoint whose layout is made, or brought up to date */
    readonly target: string;
    /** the last active breakpoint: the fallback source, and whose items the target shows */
    readonly from: string | undefined;
    /** the target's rules (its columns) */
    readonly rules: LayoutRules;
}

/**
 * The target's layout: its own when it has one, else the nearest larger breakpoint's, else the
 * last active one's, else the nearest smaller one's; with the last active breakpoint's items
 * (one it lacks comes in below everything at the column it had, one it has alone goes); then
 * within the target's columns and settled. The target's own layout, unchanged, when nothing
 * differs.
 */
export function generateLayout(generation: Generation): Layout {
    const { layouts, breakpoints, target, from, rules } = generation;
    const sorted = sortBreakpoints(breakpoints);
    const at = sorted.indexOf(target);
    const larger = sorted.slice(at + 1);
    const smaller = sorted.slice(0, Math.max(at, 0)).reverse();
    const own = layouts[target];
    const source =
        own ??
        [...larger, ...(from === undefined ? [] : [from]), ...smaller]
            .map((name) => layouts[name])
            .find((layout) => layout !== undefined) ??
        [];
    const items = from === undefined ? undefined : layouts[from];
    let base: Layout = source;
    if (items && items !== source) {
        const wanted = new Set(items.map((item) => item.id));
        const kept = source.filter((item) => wanted.has(item.id));
        const present = new Set(kept.map((item) => item.id));
        const below = bottom(kept);
        const added: LayoutItem[] = items
            .filter((item) => !present.has(item.id))
            .map((item) => ({ ...item, y: below }));
        if (added.length > 0 || kept.length !== source.length) {
            base = [...kept, ...added];
        }
    }
    const settled = normaliseLayout(base, rules);
    return settled.ok ? settled.layout : (own ?? []);
}

/**
 * A value for each breakpoint, or one for all (`isOne` tells them apart): the breakpoint's, else
 * `fallback`.
 */
export function valueAt<T>(
    value: T | Readonly<Record<string, T>> | undefined,
    breakpoint: string,
    isOne: (value: unknown) => boolean,
    fallback: T,
): T {
    if (value === undefined) return fallback;
    if (isOne(value)) return value as T;
    return (value as Readonly<Record<string, T>>)[breakpoint] ?? fallback;
}
