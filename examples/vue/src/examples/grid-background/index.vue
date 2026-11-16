<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The grid's cells drawn behind the items, shown only while something moves: `Cells` renders one
// element per cell, placed like a 1 × 1 item, down to the layout's bottom plus a row (the
// preview's, while a drag runs). Their look is the app's: here a dotted outline that fades in
// while the root carries `data-dragging`, `data-resizing` or `data-grabbed` (styles.ts).
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :row-height="56"
            :gap="[10, 10]"
            aria-label="Dashboard"
            :class="styles.root"
        >
            <!-- first: drawn under the items -->
            <GridLayout.Cells :class="styles.cell" />
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
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
