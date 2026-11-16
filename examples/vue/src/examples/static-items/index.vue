<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { Pin } from "@lucide/vue";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Two statics: a banner across the top and a pinned widget. A static never moves, by a person
// or by compaction: the other items flow around it, and one dropped on it goes around it too.
const layout: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "uptime", x: 8, y: 1, w: 4, h: 2, static: true },
    { id: "visitors", x: 0, y: 3, w: 6, h: 2 },
    { id: "latency", x: 6, y: 3, w: 6, h: 2 },
];

const name = (id: string) =>
    id === "banner" ? "Announcements" : widget(id).title;
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Dashboard with pinned items"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="name(item.id)"
                    :class="styles.item(item.static)"
                >
                    <span :class="styles.title">
                        <Pin v-if="item.static" aria-label="Pinned" :class="styles.pin" />
                        {{ name(item.id) }}
                    </span>
                    <span v-if="item.id === 'banner'" :class="styles.note">
                        Statics stay put; the rest flow around them.
                    </span>
                    <span v-else :class="styles.value">{{ widget(item.id).value }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
