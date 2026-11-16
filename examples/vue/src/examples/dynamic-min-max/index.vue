<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { ref, useId } from "vue";
import { Switch } from "#/components/ui/switch";
import RulesMiddleware from "./rules-middleware.vue";
import type { SizeRules } from "./rules";
import * as styles from "./styles";

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 3, h: 2 },
    { id: "b", x: 3, y: 0, w: 4, h: 3 },
    { id: "c", x: 7, y: 0, w: 2, h: 1 },
    { id: "d", x: 9, y: 0, w: 3, h: 2 },
    { id: "e", x: 0, y: 3, w: 8, h: 1 },
    { id: "f", x: 8, y: 2, w: 4, h: 2 },
];

// Limits that move with the size: an item taller than 2 rows must be at least 4 columns wide, and
// one wider than 6 columns stays 1 row tall. Static limits (minW, maxH) cannot say that, and a
// constraint knows nothing of the app's switches: middleware on the resize commands rewrites the
// size the model is asked for, so the preview, the drop and the keyboard all obey.
const rules = ref<SizeRules>({
    tallNeedsWidth: true,
    wideStaysShort: true,
});
const tall = useId();
const wide = useId();
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.option">
                <Switch.Root
                    :aria-labelledby="tall"
                    :model-value="rules.tallNeedsWidth"
                    @update:model-value="(on: boolean) => (rules = { ...rules, tallNeedsWidth: on })"
                >
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="tall">Taller than 2 rows from 4 columns wide</span>
            </span>
            <span :class="styles.option">
                <Switch.Root
                    :aria-labelledby="wide"
                    :model-value="rules.wideStaysShort"
                    @update:model-value="(on: boolean) => (rules = { ...rules, wideStaysShort: on })"
                >
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="wide">Wider than 6 columns at 1 row tall</span>
            </span>
        </div>
        <GridLayout.Root
            :default-layout="layout"
            :row-height="48"
            :gap="[10, 10]"
            aria-label="Items with size rules"
            :class="styles.root"
        >
            <RulesMiddleware :rules="rules" />
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="`Item ${item.id.toUpperCase()}`"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ item.id.toUpperCase() }}</span>
                    <span :class="styles.value">{{ item.w }} × {{ item.h }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize item ${item.id.toUpperCase()}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
