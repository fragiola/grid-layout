import type { GridLayoutContextValue } from "@fragiola/grid-layout-vue";
import {
    type ComputedRef,
    type Ref,
    type ShallowRef,
    shallowRef,
    watchEffect,
} from "vue";
import {
    createUndoHistory,
    type UndoHistory,
    type UndoSnapshot,
} from "../_kit/undo";

const EMPTY: UndoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoSteps: [],
    redoSteps: [],
};

/** The grid's history: made once its root holds the ref, dropped with it. */
export function useUndoHistory(
    grid: ComputedRef<GridLayoutContextValue | null>,
): {
    history: ShallowRef<UndoHistory | undefined>;
    snapshot: Readonly<Ref<UndoSnapshot>>;
} {
    const history = shallowRef<UndoHistory>();
    const snapshot = shallowRef<UndoSnapshot>(EMPTY);
    watchEffect((onCleanup) => {
        const model = grid.value?.model;
        if (!model) return;
        const made = createUndoHistory(model);
        history.value = made;
        snapshot.value = made.getSnapshot();
        const stop = made.subscribe(() => {
            snapshot.value = made.getSnapshot();
        });
        onCleanup(() => {
            stop();
            made.dispose();
            history.value = undefined;
            snapshot.value = EMPTY;
        });
    });
    return { history, snapshot };
}
