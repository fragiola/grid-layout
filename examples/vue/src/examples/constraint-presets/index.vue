<script setup lang="ts">
import {
    boundedX,
    boundedY,
    containerBounds,
    defaultConstraints,
    GridLayout,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-vue";
import { computed, ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

const MAX_ROWS = 8;

// Each preset is a stable list (module level): a new list configures the grid again.
const PRESETS: {
    name: string;
    constraints: readonly LayoutConstraint[];
    says: string;
}[] = [
    {
        name: "Default",
        constraints: defaultConstraints,
        says: "Items stay inside the columns and the first 8 rows; B and D keep their own limits.",
    },
    {
        name: "Bounded X",
        constraints: [boundedX, minMaxSize],
        says: "Only the columns bound a move: without compaction, an item goes below row 8.",
    },
    {
        name: "Bounded Y",
        constraints: [boundedY, minMaxSize],
        says: "A move stops at row 8 (the columns are always a hard rule); a resize may grow past it.",
    },
    {
        name: "Container",
        constraints: [containerBounds, minMaxSize],
        says: "Items stay inside the rows the grid shows: its own height, not maxRows.",
    },
    {
        name: "Grid bounds only",
        constraints: [gridBounds],
        says: "No minMaxSize: B and D resize past their own limits.",
    },
    {
        name: "None",
        constraints: [],
        says: "No rule but the columns: items go below row 8 and ignore their limits.",
    },
];

const CONTAINER = 3;

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 2, h: 3, minH: 2, maxH: 4 },
    { id: "e", x: 9, y: 0, w: 3, h: 2 },
    { id: "f", x: 0, y: 2, w: 5, h: 2 },
];

const limits = (item: Layout[number]) =>
    item.minW !== undefined
        ? `width ${item.minW}–${item.maxW}`
        : item.minH !== undefined
          ? `height ${item.minH}–${item.maxH}`
          : undefined;

// The grid's constraints decide where every place and size may go, by pointer, keyboard or
// command. The defaults are gridBounds (the columns and maxRows) then minMaxSize (each item's own
// limits); a preset replaces the list. Compaction runs after the constraints: with vertical
// compaction an item put low still rises, so turn it off to see a position rule alone.
const preset = ref(0);
const compact = ref(false);
const label = useId();
const current = computed(() => PRESETS[preset.value] ?? PRESETS[0]);
const container = computed(() => preset.value === CONTAINER);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <fieldset aria-label="Constraints" :class="styles.segments">
                <Clickable.Button
                    v-for="(entry, index) in PRESETS"
                    :key="entry.name"
                    size="sm"
                    :variant="index === preset ? 'solid' : 'outline'"
                    :class="styles.segment(index === preset)"
                    :aria-pressed="index === preset"
                    @click="preset = index"
                >
                    {{ entry.name }}
                </Clickable.Button>
            </fieldset>
            <span :class="styles.option">
                <Switch.Root v-model="compact" :aria-labelledby="label">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="label">Vertical compaction</span>
            </span>
        </div>
        <p :class="styles.note">
            <code :class="styles.code">[{{ current?.constraints.map((rule) => rule.name).join(", ") }}]</code>
            {{ current?.says }}
        </p>
        <!-- each preset starts from the same layout: one may have left items where another
             forbids them -->
        <!-- containerBounds reads the root's own height: a fixed one, not the layout's -->
        <GridLayout.Root
            :key="preset"
            :default-layout="layout"
            :constraints="current?.constraints"
            :compactor="compact ? verticalCompactor : noCompactor"
            :max-rows="MAX_ROWS"
            :auto-size="!container"
            :row-height="40"
            :gap="[10, 10]"
            :aria-label="`${current?.name} constraints`"
            :class="styles.root(container)"
        >
            <!-- where maxRows ends, drawn under the items: a picture of the rule, no part -->
            <div v-if="!container" aria-hidden="true" :class="styles.maxRows">
                maxRows {{ MAX_ROWS }}
            </div>
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="`Item ${item.id.toUpperCase()}`"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ item.id.toUpperCase() }}</span>
                    <span :class="styles.value">{{ item.w }} × {{ item.h }}</span>
                    <span :class="styles.place">x {{ item.x }}, y {{ item.y }}</span>
                    <span v-if="limits(item)" :class="styles.place">
                        {{ limits(item) }}
                    </span>
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
