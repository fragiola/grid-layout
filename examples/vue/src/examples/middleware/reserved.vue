<script setup lang="ts">
import { itemPixels, useGridLayoutView } from "@fragiola/grid-layout-vue";
import { computed } from "vue";
import { RESERVED } from "./rules";
import * as styles from "./styles";

// The reserved area, drawn under the items where the grid places a box of its size.
const view = useGridLayoutView();
const box = computed(() => {
    const { geometry } = view.value;
    return geometry ? itemPixels(geometry, RESERVED) : undefined;
});
</script>

<template>
    <!-- the box is the grid's geometry: logical, from the inline-start edge -->
    <div
        v-if="box"
        aria-hidden="true"
        :class="styles.reserved"
        :style="{
            insetInlineStart: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
        }"
    >
        Reserved
    </div>
</template>
