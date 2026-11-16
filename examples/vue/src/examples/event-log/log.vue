<script setup lang="ts">
import {
    type CommandEvent,
    type GestureEvent,
    type GridLayoutRef,
    type LayoutItem,
    useGridLayout,
    useGridLayoutEvents,
} from "@fragiola/grid-layout-vue";
import { Eraser } from "@lucide/vue";
import { reactive, ref, useId, watchEffect } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();

/** A line of the log: a command the model committed, or a gesture's step. */
interface Entry {
    readonly kind: "command" | "gesture";
    readonly name: string;
    readonly detail: string;
}

/** What to log. */
interface Filters {
    commands: boolean;
    gestures: boolean;
    /** the steps in between (`drag`, `resize`, `move`, `drop-over`): many per gesture */
    steps: boolean;
}

const FILTERS: { key: keyof Filters; label: string }[] = [
    { key: "commands", label: "Commands" },
    { key: "gestures", label: "Gestures" },
    { key: "steps", label: "Every step" },
];

/** The lines kept: the oldest go first. */
const LIMIT = 60;

const STEPS = new Set(["drag", "resize", "move", "drop-over"]);

const box = (item: Pick<LayoutItem, "x" | "y" | "w" | "h">) =>
    `x ${item.x}, y ${item.y}, ${item.w} × ${item.h}`;

/** A command in words: the item it named and where it settled, when it names one. */
function describeCommand(event: CommandEvent): Entry {
    const result = event.result as { item?: LayoutItem; itemId?: string };
    const detail = result.item
        ? `${widget(result.item.id).title} at ${box(result.item)}`
        : result.itemId
          ? widget(result.itemId).title
          : `breakpoint ${event.after.breakpoint}, ${event.after.layouts[event.after.breakpoint]?.length ?? 0} items`;
    return { kind: "command", name: event.command, detail };
}

/** A gesture's step in words: who, by what, and where it is now. */
function describeEvent(event: GestureEvent): Entry {
    const where = event.outside ? "off the grid" : `at ${box(event.item)}`;
    return {
        kind: "gesture",
        name: event.type,
        detail: `${widget(event.itemId).title} (${event.source}) ${where}`,
    };
}

// The log panel: its filters, and the newest lines first. The listeners read the filters as they
// are when an event comes.
const lines = ref<readonly LogLine<Entry>[]>([]);
const filters = reactive<Filters>({
    commands: true,
    gestures: true,
    steps: false,
});
const id = useId();
const add = (entry: Entry) => {
    lines.value = prepend(lines.value, entry, LIMIT);
};

const grid = useGridLayout(props.gridLayoutRef);
watchEffect((onCleanup) => {
    const model = grid.value?.model;
    if (!model) return;
    onCleanup(
        model.subscribe((event) => {
            if (filters.commands) add(describeCommand(event));
        }),
    );
});
useGridLayoutEvents((event) => {
    if (STEPS.has(event.type) ? filters.steps : filters.gestures)
        add(describeEvent(event));
}, props.gridLayoutRef);
</script>

<template>
    <section :aria-labelledby="`${id}-title`" :class="styles.panel">
        <div :class="styles.panelHead">
            <h2 :id="`${id}-title`" :class="styles.panelTitle">Events</h2>
            <Clickable.Button
                size="sm"
                variant="icon"
                shape="square"
                aria-label="Clear the log"
                @click="lines = []"
            >
                <Eraser aria-hidden="true" />
            </Clickable.Button>
        </div>
        <div :class="styles.filters">
            <span v-for="{ key, label } in FILTERS" :key="key" :class="styles.filter">
                <Switch.Root
                    v-model="filters[key]"
                    :aria-labelledby="`${id}-${key}`"
                >
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="`${id}-${key}`">{{ label }}</span>
            </span>
        </div>
        <ol role="log" aria-label="Events" :class="styles.log">
            <li v-if="lines.length === 0" :class="styles.empty">
                Drag or resize a widget, or Tab to one and press Space.
            </li>
            <li v-for="{ key, entry } in lines" :key="key" :class="styles.line">
                <span :class="styles.kind(entry.kind)">{{ entry.kind }}</span>
                <code :class="styles.name">{{ entry.name }}</code>
                <span :class="styles.detail">{{ entry.detail }}</span>
            </li>
        </ol>
    </section>
</template>
