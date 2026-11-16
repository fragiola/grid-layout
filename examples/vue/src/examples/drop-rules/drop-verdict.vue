<script setup lang="ts">
// What the rules say about the drop in progress.

import { type GridLayoutRef, useGridLayoutView } from "@fragiola/grid-layout-vue";
import { computed } from "vue";
import * as styles from "./styles";

const props = defineProps<{
    gridLayoutRef: GridLayoutRef;
    reason: { current: string };
}>();
const view = useGridLayoutView(props.gridLayoutRef);
const said = computed(() => {
    const current = view.value;
    const dropping =
        current?.gesture?.kind === "drop" && !current.gesture.outside;
    return current?.dropRefused
        ? props.reason.current
        : dropping
          ? "Allowed here."
          : "Drag a widget onto the grid.";
});
</script>

<template>
    <p role="status" :class="styles.verdict">{{ said }}</p>
</template>
