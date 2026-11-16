// A toolbox: the widgets taken off the grid, kept with the size they had so they come back as they
// were. App policy (D14): the grid only reports an item dragged out; keeping it is the app's.

/** A widget in the toolbox: its id and the size it had on the grid. */
export interface Stowed {
    readonly id: string;
    readonly w: number;
    readonly h: number;
}

/** The toolbox with `item` put away (once, newest first). */
export function stow(
    toolbox: readonly Stowed[],
    item: Stowed,
): readonly Stowed[] {
    return [
        { id: item.id, w: item.w, h: item.h },
        ...toolbox.filter((entry) => entry.id !== item.id),
    ];
}

/** The toolbox without `id` (it went back on the grid). */
export function unstow(
    toolbox: readonly Stowed[],
    id: string,
): readonly Stowed[] {
    return toolbox.filter((entry) => entry.id !== id);
}
