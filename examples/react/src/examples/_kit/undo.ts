// Undo and redo for a grid layout's model, as app code: the package ships none (D14), so what
// counts as a step is the app's to decide. Copy this file and change it freely.
//
// It is built on two verbs only: `model.subscribe` tells every committed command with the state
// `before` and `after` it, and `model.run("layouts.set")` puts every breakpoint's layout back.
// States are immutable, so keeping one costs nothing. The kit never imports the package: the
// model is described by the few members this file reads, and the real one fits.

/** The part of the model's state the history keeps: every breakpoint's layout. */
export interface LayoutsState<L> {
    readonly layouts: Readonly<Record<string, L>>;
}

/** What `model.subscribe` tells: the command, its payload, and the state around it. */
export interface CommandEventLike<L> {
    readonly command: string;
    readonly payload: unknown;
    readonly before: LayoutsState<L>;
    readonly after: LayoutsState<L>;
}

/** The members of a grid layout model the history uses (`useGridLayout().model` fits). */
export interface HistoryModel<L> {
    subscribe(listener: (event: CommandEventLike<L>) => void): () => void;
    run(
        command: "layouts.set",
        payload: { readonly layouts: Readonly<Record<string, L>> },
    ): { readonly ok: boolean };
}

/** A step of the history: the command that made it, and the item it named (if any). */
export interface UndoStep {
    readonly command: string;
    readonly itemId: string | undefined;
}

/** The history's state for a render: the same object until it changes. */
export interface UndoSnapshot {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** what undo goes back through, oldest first: the last one is undone next */
    readonly undoSteps: readonly UndoStep[];
    /** what redo goes forward through, the next one last */
    readonly redoSteps: readonly UndoStep[];
}

/** Options for {@link createUndoHistory}. */
export interface UndoOptions {
    /** the steps kept, oldest dropped first (default 100) */
    readonly limit?: number;
    /** commands that never make a step, even when they change a layout (default none) */
    readonly ignore?: readonly string[];
}

/** A history over one model: undo, redo, and a snapshot to render. */
export interface UndoHistory {
    /** puts back every layout as it was before the last step; says whether it could */
    undo(): boolean;
    /** applies again the last step undone; says whether it could */
    redo(): boolean;
    /** the current snapshot (bound: `useSyncExternalStore(history.subscribe, history.getSnapshot)`) */
    getSnapshot(): UndoSnapshot;
    /** calls `listener` when the snapshot changes; returns the remover (bound) */
    subscribe(listener: () => void): () => void;
    /** stops listening to the model */
    dispose(): void;
}

/** A step, and the layouts on each side of it. */
interface Entry<L> {
    readonly step: UndoStep;
    readonly before: Readonly<Record<string, L>>;
    readonly after: Readonly<Record<string, L>>;
}

/** The item a command's payload names, if any (`item.move` names `itemId`, `item.add` an item). */
function itemIdOf(payload: unknown): string | undefined {
    if (typeof payload !== "object" || payload === null) return undefined;
    if ("itemId" in payload && typeof payload.itemId === "string")
        return payload.itemId;
    if (
        "item" in payload &&
        typeof payload.item === "object" &&
        payload.item !== null &&
        "id" in payload.item &&
        typeof payload.item.id === "string"
    )
        return payload.item.id;
    return undefined;
}

/**
 * Undo and redo for a grid layout's model. Every committed command that changes a layout is a
 * step: a drag, a resize, a drop, a removal, a breakpoint's layout generated. A command that
 * changes no layout (a breakpoint switch alone, a rule) makes none. Undo runs `layouts.set` with
 * the step's `before`, redo with its `after`; the history does not record its own restores.
 *
 * Restoring layouts that lack the active breakpoint's (undoing its generation while it shows)
 * makes the model generate it again at once: a grid always has a layout for what it shows.
 *
 * ```ts
 * const history = createUndoHistory(model);
 * history.undo();
 * history.dispose();
 * ```
 */
export function createUndoHistory<L>(
    model: HistoryModel<L>,
    options: UndoOptions = {},
): UndoHistory {
    const limit = options.limit ?? 100;
    const ignore = options.ignore ?? [];
    let done: Entry<L>[] = [];
    let undone: Entry<L>[] = [];
    /** an undo or a redo is running: what it commits is not a step */
    let restoring = false;
    const listeners = new Set<() => void>();
    let snapshot = snapshotOf();

    function snapshotOf(): UndoSnapshot {
        return {
            canUndo: done.length > 0,
            canRedo: undone.length > 0,
            undoSteps: done.map((entry) => entry.step),
            redoSteps: undone.map((entry) => entry.step),
        };
    }

    function changed() {
        snapshot = snapshotOf();
        for (const listener of [...listeners]) listener();
    }

    const stop = model.subscribe((event) => {
        if (restoring) return;
        if (event.before.layouts === event.after.layouts) return;
        if (ignore.includes(event.command)) return;
        done = [
            ...done,
            {
                step: {
                    command: event.command,
                    itemId: itemIdOf(event.payload),
                },
                before: event.before.layouts,
                after: event.after.layouts,
            },
        ].slice(-limit);
        undone = [];
        changed();
    });

    /** Puts `layouts` back; `layouts.generate` may follow, inside the same run. */
    function restore(layouts: Readonly<Record<string, L>>): boolean {
        restoring = true;
        try {
            return model.run("layouts.set", { layouts }).ok;
        } finally {
            restoring = false;
        }
    }

    return {
        undo() {
            const entry = done.at(-1);
            // refused (a middleware vetoed it): the step stays
            if (!entry || !restore(entry.before)) return false;
            done = done.slice(0, -1);
            undone = [...undone, entry];
            changed();
            return true;
        },
        redo() {
            const entry = undone.at(-1);
            if (!entry || !restore(entry.after)) return false;
            undone = undone.slice(0, -1);
            done = [...done, entry];
            changed();
            return true;
        },
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispose: stop,
    };
}

/** What {@link undoKey} reads of a key event: a DOM `KeyboardEvent`, or React's. */
type UndoKeyEvent = Pick<
    KeyboardEvent,
    "key" | "ctrlKey" | "metaKey" | "shiftKey" | "target"
>;

/**
 * The history shortcut a key event means: Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z and Ctrl/Cmd+Y
 * redo. `undefined` for any other key, and inside a text field, which keeps its own undo.
 */
export function undoKey(event: UndoKeyEvent): "undo" | "redo" | undefined {
    if (!(event.ctrlKey || event.metaKey)) return undefined;
    const target = event.target;
    if (
        target !== null &&
        "closest" in target &&
        typeof target.closest === "function" &&
        target.closest("input, textarea, select, [contenteditable]") !== null
    ) {
        return undefined;
    }
    const key = event.key.toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y") return "redo";
    return undefined;
}
