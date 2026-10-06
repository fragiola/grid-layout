// Size rules that depend on the size itself: a minimum or maximum that moves as the item grows.
// The side being pulled gives way: pulling the height, the height stops; pulling the width, the
// width stops; pulling both (a corner), the height settles first, then the width for that height.

/** Which rules apply: the app's state, read by the middleware. */
export interface SizeRules {
    /** taller than 2 rows only from 4 columns wide */
    readonly tallNeedsWidth: boolean;
    /** wider than 6 columns only at 1 row tall */
    readonly wideStaysShort: boolean;
}

interface Size {
    readonly w: number;
    readonly h: number;
}

/** The size an item `before` this size may take when `asked` for another, under `rules`. */
export function allowedSize(before: Size, asked: Size, rules: SizeRules): Size {
    let { w, h } = asked;
    if (h !== before.h) {
        if (rules.tallNeedsWidth && w < 4) h = Math.min(h, 2);
        if (rules.wideStaysShort && w > 6) h = 1;
    }
    if (w !== before.w) {
        if (rules.tallNeedsWidth && h > 2) w = Math.max(w, 4);
        if (rules.wideStaysShort && h > 1) w = Math.min(w, 6);
    }
    return { w, h };
}
