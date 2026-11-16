<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5];

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
    { id: "orders", x: 3, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 6, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 4, h: 2 },
    { id: "latency", x: 4, y: 2, w: 4, h: 2 },
];

// The grid on a zoomable canvas: a `transform: scale()` on a wrapper draws it smaller or larger
// without changing its layout. The grid reads the scale off its own box when a gesture starts,
// so a held item stays under the pointer and lands where it is dropped at any zoom, with no
// `scale` prop (pass one only when the box cannot tell, e.g. a scale animated mid-gesture).
const zoom = ref(1);
</script>

<template>
    <div :class="styles.frame">
        <fieldset aria-label="Zoom" :class="styles.segments">
            <Clickable.Button
                v-for="value in ZOOMS"
                :key="value"
                size="sm"
                :variant="value === zoom ? 'solid' : 'outline'"
                :class="styles.segment(value === zoom)"
                :aria-pressed="value === zoom"
                @click="zoom = value"
            >
                {{ value * 100 }}%
            </Clickable.Button>
        </fieldset>
        <div :class="styles.viewport">
            <!-- the canvas's zoom: an app's transform, the grid inside it unaware -->
            <div :class="styles.canvas" :style="{ transform: `scale(${zoom})` }">
                <GridLayout.Root
                    :default-layout="layout"
                    :cols="8"
                    :row-height="48"
                    :gap="[10, 10]"
                    :padding="[10, 10]"
                    aria-label="Zoomed dashboard"
                    :class="styles.root"
                >
                    <GridLayout.Items v-slot="{ item }">
                        <GridLayout.Item
                            :item-id="item.id"
                            :aria-label="widget(item.id).title"
                            :class="styles.item"
                        >
                            <span :class="styles.title">{{ widget(item.id).title }}</span>
                            <span :class="styles.place">
                                column {{ item.x }}, row {{ item.y }} · {{ item.w }} × {{ item.h }}
                            </span>
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
        </div>
    </div>
</template>
