<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { widget } from "../_kit/widgets";
import WidgetShelf from "./widget-shelf.vue";
import * as styles from "./styles";

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 1 },
    { id: "orders", x: 0, y: 1, w: 1, h: 1 },
    { id: "visitors", x: 1, y: 1, w: 1, h: 1 },
];

// A drag source starts at the touch (`touch-action: none` on it): no hold, as a handle. The
// sheet scrolls sideways from its edges, not from a source. From the keyboard, Enter on a source
// brings its widget in at the first free cell. Each source names its widget's own id: what the
// grid shows is the app's content for that id, and a widget on the grid is not offered again.
const gridLayoutRef = useGridLayoutRef();
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.phone">
            <div :class="styles.screen">
                <GridLayout.Root
                    :grid-layout-ref="gridLayoutRef"
                    :cols="2"
                    :row-height="84"
                    :gap="[10, 10]"
                    :default-layout="START"
                    aria-label="Your widgets"
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
            <WidgetShelf :grid-layout-ref="gridLayoutRef" />
            <GridLayout.DragPreview
                v-slot="{ state }"
                :grid-layout-ref="gridLayoutRef"
                :class="styles.preview"
            >
                {{ widget(state.itemId).title }}
            </GridLayout.DragPreview>
        </div>
    </div>
</template>
