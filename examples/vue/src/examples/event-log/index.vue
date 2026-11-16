<script setup lang="ts">
import { GridLayout, useGridLayoutRef } from "@fragiola/grid-layout-vue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import EventLog from "./log.vue";
import * as styles from "./styles";

const layout = dashboard();

// Two streams, read from outside the root through a `gridLayoutRef`: `model.subscribe` tells
// every committed command with the state before and after it, whoever ran it; the engine's events
// (`useGridLayoutEvents`) tell every step of a pointer or keyboard gesture. A drag is a
// `drag-start`, its `drag` steps, a `drag-stop`, and one `item.move` between the last two.
const gridLayoutRef = useGridLayoutRef();
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="layout"
            :row-height="48"
            :gap="[10, 10]"
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
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
        <EventLog :grid-layout-ref="gridLayoutRef" />
    </div>
</template>
