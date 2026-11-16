<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { ref, useId } from "vue";
import { Switch } from "#/components/ui/switch";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// `bounded`: a dragged item stays inside the root, whatever the pointer does. Off, it follows
// the pointer past the edges and lands on the nearest cell inside.
const bounded = ref(true);
const label = useId();
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.option">
                <Switch.Root v-model="bounded" :aria-labelledby="label">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="label">Keep dragged items inside the grid</span>
            </span>
        </div>
        <GridLayout.Root
            :default-layout="layout"
            :bounded="bounded"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Bounded dashboard"
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
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
