<script setup lang="ts">
import {
    type Compactor,
    GridLayout,
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-vue";
import { computed, ref, useId } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { scattered } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const MODES: { name: string; compactor: Compactor }[] = [
    { name: "Vertical", compactor: verticalCompactor },
    { name: "Horizontal", compactor: horizontalCompactor },
    { name: "None", compactor: noCompactor },
];

const ids = WIDGETS.map((entry) => entry.id);

// How a layout settles after every change. Vertical (the default) lifts items into the gaps
// above; horizontal pulls them toward the start; none leaves them where they are put, pushing
// down only what would overlap. preventCollision refuses a move into an occupied cell instead of
// pushing. The same scattered layout, settled each way.
const mode = ref(0);
const preventCollision = ref(false);
const count = ref(8);
const label = useId();
const current = computed(() => MODES[mode.value] ?? MODES[0]);
const start = computed(() => scattered(ids, count.value, 12));
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <fieldset aria-label="Compaction" :class="styles.segments">
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
            <span :class="styles.option">
                <Switch.Root v-model="preventCollision" :aria-labelledby="label">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="label">Prevent collisions</span>
            </span>
            <span :class="styles.option">
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-label="Fewer items"
                    @click="count = Math.max(2, count - 2)"
                >
                    −
                </Clickable.Button>
                <output aria-label="Items" :class="styles.count">{{ count }}</output>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-label="More items"
                    @click="count = Math.min(24, count + 2)"
                >
                    +
                </Clickable.Button>
            </span>
        </div>
        <!-- a new layout for a new count: `default-layout` is read when a grid starts -->
        <GridLayout.Root
            :key="count"
            :default-layout="start"
            :compactor="current?.compactor"
            :prevent-collision="preventCollision"
            :row-height="48"
            :gap="[10, 10]"
            :aria-label="`${current?.name} compaction`"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="item.id"
                    :class="styles.item"
                >
                    <span :class="styles.title">
                        {{ widget(item.id.split("-")[0] ?? item.id).title }}
                    </span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
