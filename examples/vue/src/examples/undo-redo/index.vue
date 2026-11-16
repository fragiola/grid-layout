<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { StickyNote } from "@lucide/vue";
import { ref } from "vue";
import { NOTE } from "../_kit/catalogue";
import * as styles from "./styles";
import { titleOf } from "./titles";
import Toolbar from "./toolbar.vue";

const BREAKPOINTS = { wide: 480, narrow: 0 };
const COLS = { wide: 12, narrow: 4 };

// only the wide layout is given: the narrow one is generated the first time the grid is narrow
const LAYOUTS: Record<string, Layout> = {
    wide: [
        { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
        { id: "orders", x: 4, y: 0, w: 4, h: 2 },
        { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
        { id: "latency", x: 0, y: 2, w: 6, h: 2 },
        { id: "uptime", x: 6, y: 2, w: 6, h: 2 },
    ],
};

/** What the sidebar's source brings: a note's size. */
const NEW_NOTE = { w: 3, h: 2 };

// Undo and redo are the app's (D14): `_kit/undo.ts` listens to the model (`model.subscribe`)
// and keeps every breakpoint's layouts from before and after each committed change; undo and
// redo put them back with one `layouts.set`. A drag, a resize, a drop from the sidebar and a
// breakpoint's generated layout are each one step. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes.
const gridLayoutRef = useGridLayoutRef();
const narrow = ref(false);
let made = 0;
const createId = () => {
    made += 1;
    return `note-${made}`;
};
</script>

<template>
    <div :class="styles.frame">
        <Toolbar v-model:narrow="narrow" :grid-layout-ref="gridLayoutRef" />
        <div :class="styles.body">
            <aside :class="styles.sidebar" aria-label="New items">
                <GridLayout.DragSource
                    :grid-layout-ref="gridLayoutRef"
                    :item="NEW_NOTE"
                    aria-label="New note"
                    :class="styles.source"
                >
                    <StickyNote aria-hidden="true" :class="styles.icon" />
                    New note
                </GridLayout.DragSource>
            </aside>
            <!-- the grid's width decides its breakpoint: this box is what the toggle narrows -->
            <div :class="styles.stage(narrow)">
                <GridLayout.Root
                    :grid-layout-ref="gridLayoutRef"
                    :breakpoints="BREAKPOINTS"
                    :cols="COLS"
                    :default-layouts="LAYOUTS"
                    :row-height="44"
                    :gap="[10, 10]"
                    :create-id="createId"
                    aria-label="Dashboard"
                    :class="styles.root"
                >
                    <GridLayout.Items v-slot="{ item }">
                        <GridLayout.Item
                            :item-id="item.id"
                            :aria-label="titleOf(item.id)"
                            :class="styles.item"
                        >
                            <span :class="styles.title">{{ titleOf(item.id) }}</span>
                            <span :class="styles.place">{{
                                item.id.startsWith("note-")
                                    ? NOTE
                                    : `x ${item.x} · y ${item.y} · ${item.w} × ${item.h}`
                            }}</span>
                            <GridLayout.ResizeHandle
                                side="bottom-end"
                                :aria-label="`Resize ${titleOf(item.id)}`"
                                :class="styles.resizeHandle"
                            />
                        </GridLayout.Item>
                    </GridLayout.Items>
                    <GridLayout.Placeholder :class="styles.placeholder" />
                </GridLayout.Root>
            </div>
        </div>
        <GridLayout.DragPreview
            :grid-layout-ref="gridLayoutRef"
            :class="styles.preview"
        >
            <StickyNote aria-hidden="true" :class="styles.icon" />
            New note
        </GridLayout.DragPreview>
    </div>
</template>
