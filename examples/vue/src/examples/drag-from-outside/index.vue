<script setup lang="ts">
import {
    type DropDetails,
    GridLayout,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { StickyNote } from "@lucide/vue";
import { ref } from "vue";
import { describeGesture } from "../_kit/announce";
import { NOTE } from "../_kit/catalogue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

// One drag source outside the grid, reaching it through a `gridLayoutRef`. Dragged in (or Tab to
// it, Enter, the arrows, Enter), it becomes a new item where it lands: one `item.add`, its id from
// `createId`. What a note says is the app's: the layout holds only ids and boxes.
const gridLayoutRef = useGridLayoutRef();
let made = 0;
const createId = () => {
    made += 1;
    return `note-${made}`;
};
const message = ref(
    "Drag the note into the grid, or Tab to it and press Enter.",
);
const last = ref("");

const isNote = (id: string) => id.startsWith("note-");
const titleOf = (id: string) =>
    isNote(id) ? `Note ${id.slice(5)}` : widget(id).title;

// says each step of a gesture, the drop's included, from outside the root
useGridLayoutEvents((event) => {
    const name = event.external ? "Note" : titleOf(event.itemId);
    const said = describeGesture(event, name);
    if (said) message.value = said;
}, gridLayoutRef);

// the drop, told once it is in the layout: here, the cell it took
const onDrop = ({ item }: DropDetails) => {
    last.value = `Last drop: column ${item.x + 1}, row ${item.y + 1}`;
};
</script>

<template>
    <div :class="styles.frame">
        <aside :class="styles.sidebar" aria-label="New items">
            <GridLayout.DragSource
                :grid-layout-ref="gridLayoutRef"
                :item="{ w: 3, h: 2, minW: 2, minH: 2 }"
                data="note"
                aria-label="New note"
                aria-roledescription="draggable"
                :class="styles.source"
            >
                <StickyNote aria-hidden="true" :class="styles.icon" />
                New note
            </GridLayout.DragSource>
            <p role="status" :class="styles.status">{{ message }}</p>
            <p v-if="last" :class="styles.last">{{ last }}</p>
        </aside>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="layout"
            :row-height="56"
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
                    <span :class="styles.title">{{ titleOf(item.id) }}</span>
                    <span :class="styles.body">
                        {{ isNote(item.id) ? NOTE : widget(item.id).value }}
                    </span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
        <!-- what follows the pointer is the app's: here a small card -->
        <GridLayout.DragPreview
            :grid-layout-ref="gridLayoutRef"
            :class="styles.preview"
        >
            <StickyNote aria-hidden="true" :class="styles.icon" />
            New note
        </GridLayout.DragPreview>
    </div>
</template>
