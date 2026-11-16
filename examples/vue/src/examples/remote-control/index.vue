<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import Controls from "./controls.vue";
import * as styles from "./styles";
import { titleOf } from "./titles";

const LAYOUT: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 1, w: 4, h: 2 },
    { id: "latency", x: 0, y: 3, w: 6, h: 2 },
    { id: "uptime", x: 6, y: 3, w: 6, h: 2 },
];

// A form beside the grid drives it from outside its root, through a `gridLayoutRef`: each button
// runs one command (`model.run`), and is enabled only when `model.check` says the command would
// apply. A static item cannot move or resize; a cell outside the columns is not a place; the
// reason the model gives is shown under the form.
const gridLayoutRef = useGridLayoutRef();
</script>

<template>
    <div :class="styles.frame">
        <Controls :grid-layout-ref="gridLayoutRef" />
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="LAYOUT"
            :row-height="48"
            :gap="[10, 10]"
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
                    <span :class="styles.place">x {{ item.x }} · y {{ item.y }} · {{ item.w }} × {{ item.h }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
