<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { widget } from "../_kit/widgets";
import { gravityCompactor } from "./gravity";
import * as styles from "./styles";

/** Four shelves, the widgets scattered along them: the compactor slides them to the start. */
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 1 },
    { id: "orders", x: 6, y: 0, w: 3, h: 1 },
    { id: "visitors", x: 2, y: 1, w: 3, h: 1 },
    { id: "conversion", x: 7, y: 1, w: 3, h: 1 },
    { id: "refunds", x: 0, y: 2, w: 5, h: 1 },
    { id: "latency", x: 8, y: 2, w: 4, h: 1 },
    { id: "uptime", x: 4, y: 3, w: 4, h: 1 },
];

// A compactor of your own (gravity.ts): rows are shelves, and every widget slides toward the
// start of its shelf until it meets another. Drop one at the end of a row and it slides back
// against the last one there; the shelves never close up. `createCompactor` (from
// `/compactors`) does the bookkeeping: the order, the statics, a copy that is never the input.
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :compactor="gravityCompactor"
            :row-height="56"
            :gap="[10, 10]"
            aria-label="Shelves"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                    <GridLayout.ResizeHandle
                        side="end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
