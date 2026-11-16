<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    verticalCompactor,
} from "@fragiola/grid-layout-vue";
import { RotateCcw, Shuffle } from "@lucide/vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const COLS = 12;

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
    { id: "orders", x: 4, y: 0, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 3, h: 2 },
    { id: "latency", x: 3, y: 2, w: 5, h: 2 },
    { id: "uptime", x: 8, y: 2, w: 4, h: 2 },
];

/**
 * The same items in another order, packed row by row and settled as the grid settles them (its
 * compactor), so the grid takes the state as it is and tells nothing back. Never the order it had.
 */
function shuffled(layout: Layout): Layout {
    const order = (items: Layout) => items.map((item) => item.id).join();
    let next = [...layout];
    while (next.length > 1 && order(next) === order(layout)) {
        next = [...layout].sort(() => Math.random() - 0.5);
    }
    let x = 0;
    let y = 0;
    let tallest = 0;
    const packed = next.map((item) => {
        if (x + item.w > COLS) {
            x = 0;
            y += tallest;
            tallest = 0;
        }
        const placed = { ...item, x, y };
        x += item.w;
        tallest = Math.max(tallest, item.h);
        return placed;
    });
    return verticalCompactor.compact(packed, COLS);
}

/** One line per item: what the state holds, readable. */
const json = (layout: Layout) =>
    `[\n${layout.map((item) => `  ${JSON.stringify({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })}`).join(",\n")}\n]`;

// The layout lives in a Vue ref: `v-model:layout` gives it to the grid and takes each committed
// change back, once per drag or resize (never during one). Reset and Shuffle only set the ref;
// the grid follows. The JSON is the state itself, not a copy of the grid's.
const layout = ref<Layout>(START);
const changes = ref(0);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.main">
            <div :class="styles.toolbar">
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    @click="layout = shuffled(layout)"
                >
                    <Shuffle aria-hidden="true" />
                    Shuffle
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    @click="layout = START"
                >
                    <RotateCcw aria-hidden="true" />
                    Reset
                </Clickable.Button>
                <p :class="styles.note">
                    @layout-change calls:
                    <span data-testid="changes">{{ changes }}</span>
                </p>
            </div>
            <GridLayout.Root
                v-model:layout="layout"
                :cols="COLS"
                :row-height="48"
                :gap="[10, 10]"
                aria-label="Dashboard"
                :class="styles.root"
                @layout-change="changes += 1"
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
        </div>
        <section aria-labelledby="state-title" :class="styles.panel">
            <h2 id="state-title" :class="styles.panelTitle">Vue state</h2>
            <pre data-testid="state" :class="styles.json">{{ json(layout) }}</pre>
        </section>
    </div>
</template>
