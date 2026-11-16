<script setup lang="ts">
// The widgets the grid does not show yet, each a drag source with the widget's own id.

import {
    GridLayout,
    type GridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-vue";
import { computed } from "vue";
import { WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const SHEET = WIDGETS.slice(3, 9);

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();
const view = useGridLayoutView(props.gridLayoutRef);
const left = computed(() => {
    const layout = view.value?.layout ?? [];
    return SHEET.filter((entry) => !layout.some((item) => item.id === entry.id));
});
</script>

<template>
    <section aria-label="Widgets to add" :class="styles.sheet">
        <p :class="styles.handle" aria-hidden="true" />
        <div :class="styles.shelf">
            <p v-if="left.length === 0" :class="styles.empty">
                Every widget is on the grid.
            </p>
            <GridLayout.DragSource
                v-for="entry in left"
                :key="entry.id"
                :grid-layout-ref="gridLayoutRef"
                :item-id="entry.id"
                :item="{ w: 1, h: 1 }"
                :aria-label="`Add ${entry.title}`"
                :class="styles.source"
            >
                <span :class="styles.title">{{ entry.title }}</span>
                <span :class="styles.sourceValue">{{ entry.value }}</span>
            </GridLayout.DragSource>
        </div>
    </section>
</template>
