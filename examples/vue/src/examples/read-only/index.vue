<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// A layout that only shows: `draggable` and `resizable` off for the whole grid. The same items,
// no gesture, and no tab stops of their own (they are not something to move).
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :draggable="false"
            :resizable="false"
            :row-height="64"
            :gap="[12, 12]"
            aria-label="Read-only dashboard"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :tabindex="-1"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                    <span :class="styles.change">
                        {{ formatChange(widget(item.id).change) }}
                    </span>
                    <!-- never shown: the grid does not resize -->
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
        </GridLayout.Root>
    </div>
</template>
