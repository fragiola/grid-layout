<script setup lang="ts">
import {
    GridLayout,
    horizontalCompactor,
    type Layout,
    type LayoutItem,
    verticalCompactor,
} from "@fragiola/grid-layout-vue";
import {
    fastHorizontalCompactor,
    fastVerticalCompactor,
} from "@fragiola/grid-layout-vue/compactors";
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { seeded } from "../_kit/layouts";
import LastCompaction from "./last-compaction.vue";
import * as styles from "./styles";
import { createCompactionTimer } from "./timer";

const COUNT = 1000;
const COLS = 48;

/**
 * `count` tiles in bands of two rows, a free row between bands and a few free cells between
 * tiles: no overlap, every gap something for the compactor to close.
 */
function tiles(count: number, seed: number): Layout {
    const random = seeded(seed);
    const items: LayoutItem[] = [];
    let x = 0;
    let band = 0;
    while (items.length < count) {
        const w = 1 + Math.floor(random() * 3);
        x += Math.floor(random() * 3);
        if (x + w > COLS) {
            x = 0;
            band += 1;
            continue;
        }
        const h = 1 + Math.floor(random() * 2);
        items.push({ id: `${items.length + 1}`, x, y: band * 3, w, h });
        x += w;
    }
    return items;
}

const timer = createCompactionTimer();

// Stable compactors (one per mode, made once): a new object would configure the grid again on
// each render.
const MODES = [
    { name: "Vertical", compactor: timer.time(verticalCompactor) },
    { name: "Fast vertical", compactor: timer.time(fastVerticalCompactor) },
    { name: "Horizontal", compactor: timer.time(horizontalCompactor) },
    {
        name: "Fast horizontal",
        compactor: timer.time(fastHorizontalCompactor),
    },
];

// A thousand tiles. The standard compactors resolve collisions one by one, which grows fast with
// the number of items; the fast ones (opt-ins, from `/compactors`) settle the same layouts in one
// pass. Pick one: the grid settles again, and every compaction (a switch, a scatter, each step of
// a drag) is timed. Tiles are plain boxes: with this many, what each one renders counts too.
const mode = ref(1);
const seed = ref(11);
const start = computed(() => tiles(COUNT, seed.value));
const current = computed(() => MODES[mode.value] ?? MODES[0]);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <fieldset aria-label="Compactor" :class="styles.segments">
                <Clickable.Button
                    v-for="(entry, index) in MODES"
                    :key="entry.name"
                    size="sm"
                    :variant="index === mode ? 'solid' : 'outline'"
                    :class="styles.segment(index === mode)"
                    :aria-pressed="index === mode"
                    @click="mode = index"
                >
                    {{ entry.name }}
                </Clickable.Button>
            </fieldset>
            <Clickable.Button size="sm" variant="outline" @click="seed += 1">
                Scatter
            </Clickable.Button>
            <LastCompaction :timer="timer" />
        </div>
        <!-- a new layout to settle: `default-layout` is read when a grid starts -->
        <GridLayout.Root
            :key="seed"
            :default-layout="start"
            :cols="COLS"
            :compactor="current?.compactor"
            :row-height="10"
            :gap="[2, 2]"
            :padding="[4, 4]"
            :aria-label="`${COUNT} tiles`"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="`Tile ${item.id}`"
                    :class="styles.item"
                />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
