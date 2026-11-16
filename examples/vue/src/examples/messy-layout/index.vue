<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { messy } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// A layout no grid would take as it is: items overlap, one runs past the last column, one starts
// left of the first, one has no row (`y: Infinity`). The grid corrects it and tells the app, once,
// through `update:layout`; holding the layout in state, the app keeps what holds.
const layout = ref<Layout>(messy());
const corrections = ref(0);
const change = (next: Layout) => {
    layout.value = next;
    corrections.value += 1;
};
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <p :class="styles.note" aria-live="polite">
                Layout changes told: {{ corrections }}
            </p>
            <Clickable.Button size="sm" variant="outline" @click="layout = messy()">
                Mess it up again
            </Clickable.Button>
        </div>
        <GridLayout.Root
            :layout="layout"
            :row-height="48"
            :gap="[10, 10]"
            aria-label="Corrected layout"
            :class="styles.root"
            @update:layout="change"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <code :class="styles.box">{{ item.x }},{{ item.y }} · {{ item.w }}×{{ item.h }}</code>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
