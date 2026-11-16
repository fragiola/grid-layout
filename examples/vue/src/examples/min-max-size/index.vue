<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Each item's own limits: a resize stops at them, whichever side pulls. They are part of the
// layout (minW, maxW, minH, maxH), so a layout that breaks them is corrected on load too.
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "orders", x: 3, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    { id: "visitors", x: 7, y: 0, w: 3, h: 2, maxW: 3, maxH: 3 },
    { id: "latency", x: 0, y: 2, w: 6, h: 1, minH: 1, maxH: 1 },
];

const limits = (item: Layout[number]) =>
    [
        `width ${item.minW ?? 1}–${item.maxW ?? "∞"}`,
        `height ${item.minH ?? 1}–${item.maxH ?? "∞"}`,
    ].join(", ");
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Widgets with size limits"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ item.w }} × {{ item.h }}</span>
                    <span :class="styles.note">{{ limits(item) }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
