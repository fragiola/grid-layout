<script setup lang="ts">
import {
    type DropDetails,
    GridLayout,
    type Layout,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { X } from "@lucide/vue";
import { ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import { CATALOGUE, entryOf, isKind, type WidgetKind } from "../_kit/catalogue";
import * as styles from "./styles";
import WidgetBody from "./widget-body.vue";

const START: Layout = [
    { id: "w-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "w-2", x: 3, y: 0, w: 6, h: 3 },
];

// The sidebar sits outside the grid and reaches it through a `gridLayoutRef`. Each card is a drag
// source with its widget's size; its kind travels as the drop's `data`, and the app keeps which
// kind each id is (the layout holds only ids and boxes). From the keyboard: Tab to a card, Enter
// brings the widget in at the first free cell, the arrows place it, Enter adds it.
const gridLayoutRef = useGridLayoutRef();
const keys = useId();
let made = START.length;
const createId = () => {
    made += 1;
    return `w-${made}`;
};
const kinds = ref<Record<string, WidgetKind>>({
    "w-1": "kpi",
    "w-2": "chart",
});
const message = ref("");
const remove = (id: string) =>
    gridLayoutRef.current?.model.run("item.remove", { itemId: id });
// the drop's data is the app's: here, the kind of widget the new id is
const onDrop = ({ item, data }: DropDetails) => {
    if (isKind(data)) kinds.value = { ...kinds.value, [item.id]: data };
};

const kindOf = (id: string) => kinds.value[id] ?? "notes";
const titleOf = (id: string) => `${entryOf(kindOf(id)).title} ${id.slice(2)}`;

// says each step, a widget coming in from the sidebar included, from outside the root
useGridLayoutEvents((event) => {
    const kind = isKind(event.data) ? event.data : kinds.value[event.itemId];
    const name = kind ? entryOf(kind).title : event.itemId;
    const said = describeGesture(event, name);
    if (said) message.value = said;
}, gridLayoutRef);
</script>

<template>
    <div :class="styles.frame">
        <aside :class="styles.sidebar" aria-label="Widgets">
            <p :class="styles.heading">Widgets</p>
            <GridLayout.DragSource
                v-for="entry in CATALOGUE"
                :key="entry.kind"
                :grid-layout-ref="gridLayoutRef"
                :item="entry.size"
                :data="entry.kind"
                :aria-label="`${entry.title} widget, ${entry.size.w} by ${entry.size.h}`"
                :aria-describedby="keys"
                :class="styles.source"
            >
                <span :class="styles.sourceTitle">{{ entry.title }}</span>
                <span :class="styles.sourceText">{{ entry.description }}</span>
            </GridLayout.DragSource>
            <p :id="keys" :class="styles.hint">
                Enter brings a widget in; the arrows place it, Shift and the
                arrows size it, Enter adds it, Escape leaves it out.
            </p>
            <p role="status" :class="styles.status">{{ message }}</p>
        </aside>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="START"
            :row-height="48"
            :gap="[12, 12]"
            :create-id="createId"
            aria-label="Dashboard"
            :class="styles.root"
            @drop="onDrop"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="titleOf(item.id)"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <span :class="styles.title">{{ titleOf(item.id) }}</span>
                        <Clickable.Button
                            size="sm"
                            variant="icon"
                            :aria-label="`Remove ${titleOf(item.id)}`"
                            @click="remove(item.id)"
                        >
                            <X aria-hidden="true" />
                        </Clickable.Button>
                    </span>
                    <WidgetBody :kind="kindOf(item.id)" />
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${titleOf(item.id)}`"
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
            <template v-if="isKind(state.data)">{{ entryOf(state.data).title }}</template>
        </GridLayout.DragPreview>
    </div>
</template>
