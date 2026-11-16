<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The primitives with nothing on top: no theme, no colours, a one-pixel outline so the boxes can
// be seen. Everything the grid layout does is here; everything it looks like is up to you.
</script>

<template>
    <GridLayout.Root
        :default-layout="layout"
        :row-height="56"
        aria-label="Unstyled grid"
    >
        <GridLayout.Items v-slot="{ item }">
            <GridLayout.Item
                :item-id="item.id"
                :aria-label="widget(item.id).title"
                :class="styles.item"
            >
                {{ widget(item.id).title }}
                <GridLayout.ResizeHandle
                    side="bottom-end"
                    :aria-label="`Resize ${widget(item.id).title}`"
                    :class="styles.resizeHandle"
                />
            </GridLayout.Item>
        </GridLayout.Items>
        <GridLayout.Placeholder :class="styles.placeholder" />
    </GridLayout.Root>
</template>
