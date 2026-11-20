<script setup lang="ts">
import { CHART_INSET, type Tick, tickLabel } from "../_kit/charts";
import * as styles from "./styles";

/** A chart's horizontal guides, each labelled with its value. */
defineProps<{ ticks: readonly Tick[]; width: number }>();
</script>

<template>
    <g v-for="tick in ticks" :key="tick.value">
        <line
            :x1="CHART_INSET.start"
            :x2="width"
            :y1="tick.y"
            :y2="tick.y"
            :class="styles.guide"
        />
        <text :x="CHART_INSET.start - 6" :y="tick.y" :class="styles.guideLabel">
            {{ tickLabel(tick.value) }}
        </text>
    </g>
</template>
