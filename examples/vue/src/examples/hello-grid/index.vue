<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :cols="12"
            :row-height="64"
            :gap="[12, 12]"
            aria-label="Dashboard"
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
                    <span :class="styles.change(widget(item.id).change)">
                        {{ formatChange(widget(item.id).change) }}
                    </span>
                    <svg
                        viewBox="0 0 100 32"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        :class="styles.chart"
                    >
                        <path :d="sparkline(widget(item.id).points)" />
                    </svg>
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
