<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { GripHorizontal } from "@lucide/vue";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 5, h: 3 },
    { id: "orders", x: 5, y: 0, w: 4, h: 2 },
    { id: "signups", x: 9, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 5, y: 2, w: 7, h: 2 },
    { id: "nps", x: 0, y: 3, w: 2, h: 2 },
    { id: "latency", x: 2, y: 3, w: 3, h: 2 },
    { id: "uptime", x: 5, y: 4, w: 7, h: 2 },
];

// Everything the grid layout looks like, from outside: cards glide into place, the one held
// lifts and tilts a little (the `rotate` and `scale` properties, so the engine's `transform`
// stays its own), the placeholder is striped, and the grip and the corner appear on hover or
// focus. All of it in styles.ts, read from data-* and the theme's tokens.
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="60"
            :gap="[14, 14]"
            aria-label="Showcase dashboard"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <span :class="styles.title">{{ widget(item.id).title }}</span>
                        <GridLayout.DragHandle
                            :aria-label="`Move ${widget(item.id).title}`"
                            :class="styles.grip"
                        >
                            <GripHorizontal aria-hidden="true" />
                        </GridLayout.DragHandle>
                    </span>
                    <span :class="styles.figure">
                        <span :class="styles.value">{{ widget(item.id).value }}</span>
                        <span :class="styles.change(widget(item.id).change)">
                            {{ formatChange(widget(item.id).change) }}
                        </span>
                    </span>
                    <svg
                        viewBox="0 0 100 32"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        :class="styles.chart"
                    >
                        <path
                            :d="`${sparkline(widget(item.id).points)} L100,32 L0,32 Z`"
                            :class="styles.area"
                        />
                        <path :d="sparkline(widget(item.id).points)" :class="styles.line" />
                    </svg>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.corner"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
