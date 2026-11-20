<script setup lang="ts">
import { computed } from "vue";
import { areaPath, linePath, scaleOf, visible } from "../_kit/charts";
import type { Series } from "../_kit/fulfillment";
import Card from "./card.vue";
import Guides from "./guides.vue";
import * as styles from "./styles";
import { useSize } from "./use-size";

/**
 * Orders received and shipped per minute: a line chart drawn at its box's size, as many recent
 * points as fit (one every 8 pixels), its guides as many as its height takes.
 */
const props = defineProps<{ received: Series; shipped: Series }>();

const size = useSize("box");
const chart = computed(() => {
    const ins = visible(props.received.history, size.value.width, 8);
    const outs = visible(props.shipped.history, size.value.width, 8);
    const scale = scaleOf(Math.max(...ins, ...outs), size.value.height);
    const line = linePath(ins, size.value, scale);
    return {
        scale,
        line,
        area: areaPath(line, size.value, scale),
        second: linePath(outs, size.value, scale),
    };
});
</script>

<template>
    <Card
        id="throughput"
        title="Throughput"
        :aside="`${received.value} in · ${shipped.value} out / min`"
    >
        <div ref="box" :class="styles.chartBox">
            <svg
                v-if="size.width > 0"
                :viewBox="`0 0 ${size.width} ${size.height}`"
                :width="size.width"
                :height="size.height"
                role="img"
                aria-label="Orders received and shipped per minute"
                :class="styles.chart"
            >
                <Guides :ticks="chart.scale.ticks" :width="size.width" />
                <path :d="chart.area" :class="styles.area" />
                <path :d="chart.line" :class="styles.line" />
                <path :d="chart.second" :class="styles.secondLine" />
            </svg>
        </div>
        <span :class="styles.legend">
            <span :class="styles.legendItem">
                <span :class="styles.legendLine" />
                Received
            </span>
            <span :class="styles.legendItem">
                <span :class="styles.legendDashed" />
                Shipped
            </span>
        </span>
    </Card>
</template>
