<script setup lang="ts">
import {
    GridLayout,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    snapToGrid,
    verticalCompactor,
} from "@fragiola/grid-layout-vue";
import { computed, ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import {
    evenColumns,
    maxArea,
    minHeightFromWidth,
    topHalf,
} from "./constraints";
import * as styles from "./styles";

const MAX_ROWS = 12;

// The app's own rules, each after the defaults (gridBounds, minMaxSize), in stable lists: a new
// list configures the grid again. `rule` is the heart of each one, shown above the grid.
const RULES: {
    name: string;
    constraints: readonly LayoutConstraint[];
    rule: string;
}[] = [
    { name: "None", constraints: [gridBounds, minMaxSize], rule: "" },
    {
        name: "Even columns",
        constraints: [gridBounds, minMaxSize, evenColumns],
        rule: "position: x = Math.round(item.x / 2) * 2",
    },
    {
        name: "Height ≥ width ÷ 2",
        constraints: [gridBounds, minMaxSize, minHeightFromWidth],
        rule: "size: h = Math.max(item.h, Math.ceil(item.w / 2))",
    },
    {
        name: "Area ≤ 12",
        constraints: [gridBounds, minMaxSize, maxArea(12)],
        rule: "size: w × h ≤ 12, the pulled side gives way",
    },
    {
        name: "Top half",
        constraints: [gridBounds, minMaxSize, topHalf],
        rule: "position: y ≤ maxRows ÷ 2 − item.h",
    },
    {
        name: "Snap to 3",
        constraints: [gridBounds, minMaxSize, snapToGrid(3)],
        rule: "snapToGrid(3): x and y round to multiples of 3 (built in)",
    },
];

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 3, h: 2 },
    { id: "e", x: 10, y: 0, w: 2, h: 2 },
    { id: "f", x: 0, y: 2, w: 4, h: 2 },
    { id: "g", x: 4, y: 3, w: 4, h: 2 },
    { id: "h", x: 8, y: 2, w: 4, h: 2 },
];

// Constraints written in the app (constraints.ts) next to the built-in snapToGrid: pick one and
// drag or resize, by pointer or keyboard. Compaction runs after the constraints, so a position
// rule on rows shows best without it.
const chosen = ref(0);
const compact = ref(true);
const label = useId();
const current = computed(() => RULES[chosen.value] ?? RULES[0]);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <fieldset aria-label="Custom rule" :class="styles.segments">
                <Clickable.Button
                    v-for="(entry, index) in RULES"
                    :key="entry.name"
                    size="sm"
                    :variant="index === chosen ? 'solid' : 'outline'"
                    :class="styles.segment(index === chosen)"
                    :aria-pressed="index === chosen"
                    @click="chosen = index"
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
            <code :class="styles.code">[{{ current?.constraints.map((constraint) => constraint.name).join(", ") }}]</code>
            <code v-if="current?.rule" :class="styles.rule">{{ current.rule }}</code>
        </p>
        <GridLayout.Root
            :default-layout="layout"
            :constraints="current?.constraints"
            :compactor="compact ? verticalCompactor : noCompactor"
            :max-rows="MAX_ROWS"
            :row-height="32"
            :gap="[10, 10]"
            :aria-label="`${current?.name} rule`"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="`Item ${item.id.toUpperCase()}`"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ item.id.toUpperCase() }}</span>
                    <span :class="styles.value">{{ item.w }} × {{ item.h }}</span>
                    <span :class="styles.place">x {{ item.x }}, y {{ item.y }}</span>
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
