<script setup lang="ts">
import { GridLayout, useGridLayoutView } from "@fragiola/grid-layout-vue";
import { computed } from "vue";
import { LANES, laneOf } from "./lanes";
import * as styles from "./styles";

/** A lane's header: a static item across its four columns, with how many notes it holds. */
const props = defineProps<{ id: string }>();

const view = useGridLayoutView();
const index = computed(() => LANES.findIndex((lane) => lane.id === props.id));
const title = computed(() => LANES[index.value]?.title ?? props.id);
// a note belongs to the lane its middle is over
const count = computed(
    () =>
        view.value.layout.filter(
            (item) =>
                !item.static &&
                laneOf(item.x + item.w / 2 - 0.5) === index.value,
        ).length,
);
</script>

<template>
    <GridLayout.Item :item-id="id" :aria-label="title" :class="styles.lane">
        <span :class="styles.laneTitle">{{ title }}</span>
        <span :class="styles.laneCount">{{ count }}</span>
    </GridLayout.Item>
</template>
