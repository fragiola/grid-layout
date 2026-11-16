<script setup lang="ts">
import {
    type GridLayoutRef,
    useBreakpoint,
    useGridLayout,
} from "@fragiola/grid-layout-vue";
import { Redo2, Undo2 } from "@lucide/vue";
import { computed, watchEffect } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { undoKey } from "../_kit/undo";
import * as styles from "./styles";
import { describe } from "./titles";
import { useUndoHistory } from "./use-undo-history";

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();
const narrow = defineModel<boolean>("narrow", { required: true });

// Undo, redo, the history, and the grid's width.
const grid = useGridLayout(props.gridLayoutRef);
const { history, snapshot } = useUndoHistory(grid);
const current = useBreakpoint(props.gridLayoutRef);
// asked again when the history changes (every layout change is a step) or the breakpoint does
const held = computed(() => {
    void snapshot.value;
    void current.value;
    const model = grid.value?.model;
    return model ? Object.keys(model.get("layouts")).join(", ") : "";
});

const steps = computed(() => [
    ...snapshot.value.undoSteps.map((step) => ({ step, undone: false })),
    // undone steps after the done ones, the next to redo first
    ...[...snapshot.value.redoSteps]
        .reverse()
        .map((step) => ({ step, undone: true })),
]);

// the shortcuts, page-wide; never in the middle of a gesture (its preview is not committed)
watchEffect((onCleanup) => {
    const made = history.value;
    const engine = grid.value?.engine;
    if (!made || !engine) return;
    const onKeyDown = (event: KeyboardEvent) => {
        const action = undoKey(event);
        if (!action || engine.get("gesture")) return;
        event.preventDefault();
        made[action]();
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
});
</script>

<template>
    <div :class="styles.toolbar">
        <div :class="styles.buttons">
            <Clickable.Button
                size="sm"
                variant="outline"
                :disabled="!snapshot.canUndo"
                aria-keyshortcuts="Control+Z Meta+Z"
                @click="history?.undo()"
            >
                <Undo2 aria-hidden="true" />
                Undo
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                :disabled="!snapshot.canRedo"
                aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                @click="history?.redo()"
            >
                <Redo2 aria-hidden="true" />
                Redo
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                :aria-pressed="narrow"
                @click="narrow = !narrow"
            >
                Narrow grid
            </Clickable.Button>
        </div>
        <p :class="styles.note">
            <span data-testid="breakpoint">{{ current ? `${current.breakpoint}, ${current.cols} columns` : "…" }}</span>
            · layouts held:
            <span data-testid="layouts">{{ held }}</span>
        </p>
        <ol aria-label="History" :class="styles.history">
            <li v-if="steps.length === 0" :class="styles.hint">
                Drag, resize, drop a note or narrow the grid: each is a step.
            </li>
            <li
                v-for="({ step, undone }, index) in steps"
                :key="index"
                :data-undone="undone ? '' : undefined"
                :class="styles.step"
            >
                {{ describe(step) }}
            </li>
        </ol>
    </div>
</template>
