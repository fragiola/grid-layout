<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    type ResizeSide,
} from "@fragiola/grid-layout-vue";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Every side and corner a person can pull: logical ones, so in right-to-left `start` is the right
// edge and nothing else changes. Where each handle sits and what it looks like is the app's: here,
// thin bars on the edges and squares on the corners, shown on hover and focus.
const SIDES: readonly ResizeSide[] = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
];

const layout: Layout = [
    { id: "revenue", x: 1, y: 1, w: 4, h: 3 },
    { id: "orders", x: 6, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 6, y: 3, w: 4, h: 2 },
];
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="48"
            :gap="[12, 12]"
            aria-label="Resizable widgets"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.size">{{ item.w }} × {{ item.h }}</span>
                    <GridLayout.ResizeHandle
                        v-for="side in SIDES"
                        :key="side"
                        :side="side"
                        :aria-label="`Resize ${widget(item.id).title} from the ${side.replace('-', ' ')}`"
                        :class="styles.handle(side)"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
