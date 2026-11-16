<script setup lang="ts">
import { GridLayout, useGridLayout } from "@fragiola/grid-layout-vue";
import { Palette, X } from "@lucide/vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { type Note, nameOf, numberOf, TONES } from "./notes";
import * as styles from "./styles";

/**
 * A sticky note. It drags from anywhere but its controls: the textarea and the buttons are native
 * controls, which never start a drag, so typing and clicking work as usual.
 */
const props = defineProps<{ id: string; note: Note }>();
const emit = defineEmits<{ change: [note: Note] }>();

const { model } = useGridLayout();
const name = computed(() => nameOf(props.id));
const tone = computed(
    () => props.note.tone ?? TONES[numberOf(props.id) % TONES.length] ?? "orange",
);
const next = computed(
    () => TONES[(TONES.indexOf(tone.value) + 1) % TONES.length],
);

const write = (event: Event) =>
    emit("change", {
        ...props.note,
        text: (event.currentTarget as HTMLTextAreaElement).value,
    });
</script>

<template>
    <GridLayout.Item :item-id="id" :aria-label="name" :class="styles.note(tone)">
        <span :class="styles.noteHeader">
            <span :class="styles.noteTitle">{{ name }}</span>
            <Clickable.Button
                size="sm"
                variant="icon"
                :aria-label="`Change the colour of ${name}`"
                @click="emit('change', { ...note, tone: next })"
            >
                <Palette aria-hidden="true" />
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="icon"
                :aria-label="`Remove ${name}`"
                @click="model.run('item.remove', { itemId: id })"
            >
                <X aria-hidden="true" />
            </Clickable.Button>
        </span>
        <textarea
            :aria-label="`Text of ${name}`"
            placeholder="Write something"
            :value="note.text"
            :class="styles.noteText"
            @input="write"
        />
    </GridLayout.Item>
</template>
