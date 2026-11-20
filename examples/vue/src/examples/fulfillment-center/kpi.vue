<script setup lang="ts">
import { formatDelta, type Series } from "../_kit/fulfillment";
import { sparkline } from "../_kit/widgets";
import Card from "./card.vue";
import * as styles from "./styles";

/** A figure, how it moved in the last minute, and its recent past. */
defineProps<{
    id: string;
    title: string;
    series: Series;
    format: (value: number) => string;
}>();
</script>

<template>
    <Card :id="id" :title="title">
        <span :class="styles.figure">
            <span :class="styles.value">{{ format(series.value) }}</span>
            <span :class="styles.delta(series.change)">
                {{ formatDelta(series.change) }} in 1 min
            </span>
        </span>
        <svg
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            :class="styles.sparkline"
        >
            <path :d="sparkline(series.history.slice(-24))" />
        </svg>
    </Card>
</template>
