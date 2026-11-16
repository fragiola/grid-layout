<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    noCompactor,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { StickyNote } from "@lucide/vue";
import { ref } from "vue";
import { describeGesture } from "../_kit/announce";
import Lane from "./lane.vue";
import { LANES } from "./lanes";
import NoteItem from "./note.vue";
import { type Note, nameOf } from "./notes";
import * as styles from "./styles";

/** The board's height in rows: the cells drawn, and how far down a note may go. */
const ROWS = 12;

// The lane headers are statics across the top; the notes start in their lanes.
const layout: Layout = [
    ...LANES.map((lane, index) => ({
        id: lane.id,
        x: index * 4,
        y: 0,
        w: 4,
        h: 1,
        static: true,
    })),
    { id: "note-1", x: 0, y: 1, w: 2, h: 3 },
    { id: "note-2", x: 2, y: 1, w: 2, h: 3 },
    { id: "note-3", x: 0, y: 4, w: 2, h: 3 },
    { id: "note-4", x: 4, y: 1, w: 2, h: 3 },
    { id: "note-5", x: 8, y: 1, w: 2, h: 3 },
];

/** What the notes say at first: the text is the app's, the layout holds only ids and boxes. */
const FIRST: Record<string, Note> = {
    "note-1": { text: "Write the release notes" },
    "note-2": { text: "Ask design about the empty states" },
    "note-3": { text: "Fix the flaky upload test" },
    "note-4": { text: "Migrate the billing page" },
    "note-5": { text: "Ship the onboarding emails" },
};

// A free-form board: nothing settles (`noCompactor`), so a note stays where it is dropped, and
// `prevent-collision` refuses a move onto another note instead of pushing it away. The lanes are
// the grid's cells, drawn behind (`GridLayout.Cells`), under static headers. A new note comes from
// the drag source above; each note's text is a textarea, which never starts a drag.
const gridLayoutRef = useGridLayoutRef();
let made = Object.keys(FIRST).length;
const notes = ref<Record<string, Note>>(FIRST);
const message = ref(
    "Drag a new note onto the board, or Tab to it and press Enter.",
);

const change = (id: string, note: Note) => {
    notes.value = { ...notes.value, [id]: note };
};

const createId = () => {
    made += 1;
    return `note-${made}`;
};

// says each step of a gesture, a note coming in from the source included
useGridLayoutEvents((event) => {
    const said = describeGesture(
        event,
        event.external ? "New note" : nameOf(event.itemId),
    );
    if (said) message.value = said;
}, gridLayoutRef);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <GridLayout.DragSource
                :grid-layout-ref="gridLayoutRef"
                :item="{ w: 2, h: 3 }"
                data="note"
                aria-label="New note"
                aria-roledescription="draggable"
                :class="styles.source"
            >
                <StickyNote aria-hidden="true" :class="styles.icon" />
                New note
            </GridLayout.DragSource>
            <p role="status" :class="styles.status">{{ message }}</p>
        </div>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="layout"
            :compactor="noCompactor"
            prevent-collision
            :max-rows="ROWS"
            :row-height="36"
            :gap="[8, 8]"
            :resizable="false"
            :create-id="createId"
            aria-label="Board"
            :class="styles.root"
        >
            <!-- first: drawn under the notes -->
            <GridLayout.Cells :rows="ROWS" :class="styles.cell" />
            <GridLayout.Items v-slot="{ item }">
                <Lane v-if="item.static" :id="item.id" />
                <NoteItem
                    v-else
                    :id="item.id"
                    :note="notes[item.id] ?? { text: '' }"
                    @change="(note) => change(item.id, note)"
                />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
        <GridLayout.DragPreview
            :grid-layout-ref="gridLayoutRef"
            :class="styles.preview"
        >
            <StickyNote aria-hidden="true" :class="styles.icon" />
            New note
        </GridLayout.DragPreview>
    </div>
</template>
