<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { ref, useId } from "vue";
import { widget } from "../_kit/widgets";
import Badge from "./badge.vue";
import * as styles from "./styles";

const BREAKPOINTS = { wide: 440, narrow: 0 };
const COLS = { wide: 6, narrow: 2 };

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "uptime", x: 0, y: 2, w: 6, h: 2 },
];
const LAYOUTS = { wide: LAYOUT };

// The breakpoint is the grid's own width's (R1): one page, two grids, two breakpoints at once.
// The panel's width is yours to change; the sidebar stays narrow. A viewport media query would
// give both the same.
const width = ref(500);
const slider = useId();

/** Two grids, each in a box of its own width, saying its breakpoint. */
const boards = [
    { label: "Panel", gridLayoutRef: useGridLayoutRef() },
    { label: "Sidebar", gridLayoutRef: useGridLayoutRef() },
];
const widthOf = (label: string) => (label === "Panel" ? width.value : 200);
</script>

<template>
    <div :class="styles.frame">
        <label :for="slider" :class="styles.control">
            Panel width
            <input
                :id="slider"
                v-model.number="width"
                type="range"
                :min="260"
                :max="760"
                :step="20"
                :class="styles.slider"
            />
            <span :class="styles.number">{{ width }}px</span>
        </label>
        <div :class="styles.page">
            <section
                v-for="board in boards"
                :key="board.label"
                :aria-label="board.label"
                :class="styles.board"
                :style="{ width: `${widthOf(board.label)}px` }"
            >
                <Badge
                    :label="board.label"
                    :grid-layout-ref="board.gridLayoutRef"
                />
                <GridLayout.Root
                    :grid-layout-ref="board.gridLayoutRef"
                    :breakpoints="BREAKPOINTS"
                    :cols="COLS"
                    :default-layouts="LAYOUTS"
                    :row-height="44"
                    :gap="[10, 10]"
                    :aria-label="`${board.label} dashboard`"
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
            </section>
        </div>
    </div>
</template>
