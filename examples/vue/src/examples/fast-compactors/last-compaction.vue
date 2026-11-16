<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as styles from "./styles";
import type { CompactionTimer } from "./timer";

const props = defineProps<{ timer: CompactionTimer }>();

// The time of the last compaction: it alone renders again when one runs.
const ms = ref(props.timer.last());
let stop: (() => void) | undefined;
onMounted(() => {
    ms.value = props.timer.last();
    stop = props.timer.subscribe(() => {
        ms.value = props.timer.last();
    });
});
onUnmounted(() => stop?.());
</script>

<template>
    <span :class="styles.timing">
        Last compaction
        <output aria-label="Last compaction" :class="styles.ms">{{ ms === undefined ? "–" : `${ms.toFixed(1)} ms` }}</output>
    </span>
</template>
