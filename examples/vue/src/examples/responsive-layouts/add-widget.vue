<script setup lang="ts">
// Adds the first widget the grid does not show, below everything (every breakpoint gets it).

import { type GridLayoutRef, useGridLayoutView } from "@fragiola/grid-layout-vue";
import { Plus } from "@lucide/vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { WIDGETS } from "../_kit/widgets";

const props = defineProps<{ gridLayoutRef: GridLayoutRef }>();
const view = useGridLayoutView(props.gridLayoutRef);
const next = computed(() => {
    const layout = view.value?.layout ?? [];
    return WIDGETS.find(
        (entry) => !layout.some((item) => item.id === entry.id),
    );
});
const add = () => {
    if (!next.value) return;
    props.gridLayoutRef.current?.model.run("item.add", {
        item: {
            id: next.value.id,
            x: 0,
            y: Number.POSITIVE_INFINITY,
            w: 2,
            h: 2,
        },
    });
};
</script>

<template>
    <Clickable.Button size="sm" :disabled="!next" @click="add">
        <Plus aria-hidden="true" />
        Add {{ next ? next.title : "widget" }}
    </Clickable.Button>
</template>
