<script setup lang="ts">
import {
    type GestureEvent,
    GridLayout,
    type Layout,
    layoutProblems,
    useGridLayoutEvents,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-vue";
import { Trash2, X } from "@lucide/vue";
import { computed, ref, useTemplateRef } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import {
    CATALOGUE,
    entryOf,
    freeId,
    isKind,
    kindOfId,
} from "../_kit/catalogue";
import { pointerOver } from "../_kit/hit";
import { forget, load, save } from "../_kit/storage";
import * as styles from "./styles";
import WidgetBody from "./widget-body.vue";

const KEY = "grid-layout:dashboard-builder";

const STARTER: Layout = [
    { id: "kpi-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "chart-1", x: 3, y: 0, w: 6, h: 3 },
    { id: "notes-1", x: 9, y: 0, w: 3, h: 3 },
];

/** An item's name: its kind and its number, from its id (`chart-3` is "Chart 3"). */
function nameOf(id: string): string {
    const kind = kindOfId(id);
    return kind ? `${entryOf(kind).title} ${id.slice(kind.length + 1)}` : id;
}

/** The saved dashboard, if the grid can use it: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Everything together, as an app would: the sidebar's widgets are drag sources outside the grid
// (through a `grid-layout-ref`), each new id says its kind (`chart-3`, the app's ids); a widget
// released over the trash is removed (`@drag-stop` reports `outside` and the element under the
// pointer); every committed change is saved; Reset starts again from the starter dashboard.
const gridLayoutRef = useGridLayoutRef();
const trash = useTemplateRef<HTMLDivElement>("trash");
const run = ref(0);
// read once per grid: `default-layout` is read when a grid starts
const start = ref<Layout>(saved() ?? STARTER);
const message = ref("");

const remove = (id: string) =>
    gridLayoutRef.current?.model.run("item.remove", { itemId: id });

function reset() {
    forget(KEY);
    start.value = STARTER;
    run.value += 1;
    message.value = "Back to the starter dashboard.";
}

function onDragStop(event: GestureEvent) {
    const target = event.target;
    if (event.outside && target && trash.value?.contains(target))
        remove(event.itemId);
}

// the sidebar's widgets: drag sources outside the grid, each naming its new item's id
const view = useGridLayoutView(gridLayoutRef);
const layout = computed(() => view.value?.layout ?? []);

// the trash opens while a widget held off the grid is over it: the pointer is the grid's while
// it holds a widget, so the drag's own events say where it is
const open = ref(false);
useGridLayoutEvents((event) => {
    open.value =
        event.type === "drag" &&
        event.outside &&
        pointerOver(trash.value, event.nativeEvent);
}, gridLayoutRef);

// says each step, a widget coming in from the sidebar included
useGridLayoutEvents((event) => {
    // a widget coming in has no number yet: its kind says what it is
    const name =
        event.external && isKind(event.data)
            ? entryOf(event.data).title
            : nameOf(event.itemId);
    const said = describeGesture(event, name);
    if (said) message.value = said;
}, gridLayoutRef);
</script>

<template>
    <div :class="styles.frame">
        <aside :class="styles.sidebar" aria-label="Widgets">
            <p :class="styles.heading">Widgets</p>
            <!-- the id says the kind: the layout alone rebuilds the dashboard -->
            <GridLayout.DragSource
                v-for="entry in CATALOGUE"
                :key="entry.kind"
                :grid-layout-ref="gridLayoutRef"
                :item-id="freeId(layout, entry.kind)"
                :item="entry.size"
                :data="entry.kind"
                :aria-label="`${entry.title} widget`"
                :class="styles.source"
            >
                <span :class="styles.sourceTitle">{{ entry.title }}</span>
                <span :class="styles.sourceText">{{ entry.description }}</span>
            </GridLayout.DragSource>
            <div ref="trash" :data-open="open ? '' : undefined" :class="styles.trash">
                <Trash2 aria-hidden="true" :class="styles.icon" />
                Drop here to remove
            </div>
            <Clickable.Button size="sm" variant="outline" @click="reset">
                Reset
            </Clickable.Button>
            <p role="status" :class="styles.status">{{ message }}</p>
        </aside>
        <!-- a new grid on reset: `default-layout` is read once, when a grid starts -->
        <GridLayout.Root
            :key="run"
            :grid-layout-ref="gridLayoutRef"
            :default-layout="start"
            :row-height="44"
            :gap="[12, 12]"
            aria-label="Your dashboard"
            :class="styles.root"
            @layout-change="(next: Layout) => save(KEY, next)"
            @drag-stop="onDragStop"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="nameOf(item.id)"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <span :class="styles.title">{{ nameOf(item.id) }}</span>
                        <Clickable.Button
                            size="sm"
                            variant="icon"
                            :aria-label="`Remove ${nameOf(item.id)}`"
                            @click="remove(item.id)"
                        >
                            <X aria-hidden="true" />
                        </Clickable.Button>
                    </span>
                    <WidgetBody :kind="kindOfId(item.id) ?? 'notes'" />
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${nameOf(item.id)}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
        <GridLayout.DragPreview
            v-slot="{ state }"
            :grid-layout-ref="gridLayoutRef"
            :class="styles.preview"
        >
            {{ isKind(state.data) ? entryOf(state.data).title : "" }}
        </GridLayout.DragPreview>
    </div>
</template>
