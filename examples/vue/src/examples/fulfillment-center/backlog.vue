<script setup lang="ts">
import { computed } from "vue";
import { columns, scaleOf, visible } from "../_kit/charts";
import { formatCount, type Series } from "../_kit/fulfillment";
import Card from "./card.vue";
import Guides from "./guides.vue";
import * as styles from "./styles";
import { useSize } from "./use-size";

/** Orders waiting, one column per reading: as many as fit its box, one every 14 pixels. */
const props = defineProps<{ backlog: Series }>();

const size = useSize("box");
const chart = computed(() => {
    const points = visible(props.backlog.history, size.value.width, 14);
    const scale = scaleOf(Math.max(...points), size.value.height);
    return { scale, bars: columns(points, size.value, scale) };
});
</script>

<template>
    <Card
        id="backlog"
        title="Backlog"
        :aside="`${formatCount(backlog.value)} orders`"
    >
        <div ref="box" :class="styles.chartBox">
            <svg
                v-if="size.width > 0"
                :viewBox="`0 0 ${size.width} ${size.height}`"
                :width="size.width"
                :height="size.height"
                role="img"
                aria-label="Orders waiting to be picked or packed"
                :class="styles.chart"
            >
                <Guides :ticks="chart.scale.ticks" :width="size.width" />
                <!-- a column is a place in the chart, not a reading: keyed by its index -->
                <rect
                    v-for="(bar, index) in chart.bars"
                    :key="index"
                    :x="bar.x"
                    :y="bar.y"
                    :width="bar.width"
                    :height="bar.height"
                    rx="1"
                    :class="
                        index === chart.bars.length - 1
                            ? styles.lastColumn
                            : styles.column
                    "
                />
            </svg>
        </div>
    </Card>
</template>
