<script setup lang="ts">
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import {
    CHANNELS,
    formatMetric,
    METRICS,
    type Metric,
    PAGES,
    RANGES,
    type Range,
    sessionsOver,
} from "../_kit/datasets";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import Card from "./card.vue";
import * as styles from "./styles";

/** What each item shows, by its id: the layout holds only ids and boxes, the content is the app's. */
const props = defineProps<{ id: string }>();

// a KPI: a figure, how it moved, and its last eight weeks
const content = computed(() => widget(props.id));

// the traffic: sessions per day over a range the header's segmented control picks
const range = ref<Range>(30);
const traffic = computed(() => sessionsOver(range.value));
const line = computed(() => sparkline(traffic.value.points, 100, 40));

// the channels: this month's, compared on a metric the header's select picks
const metric = ref<Metric>("sessions");
const metricTitle = computed(
    () => METRICS.find((entry) => entry.key === metric.value)?.title,
);
const rows = computed(() =>
    [...CHANNELS].sort((a, b) => b[metric.value] - a[metric.value]),
);
const max = computed(() => rows.value[0]?.[metric.value] || 1);
</script>

<template>
    <Card v-if="id === 'traffic'" id="traffic" title="Traffic">
        <template #controls>
            <fieldset aria-label="Range" :class="styles.segments">
                <Clickable.Button
                    v-for="days in RANGES"
                    :key="days"
                    size="sm"
                    :variant="days === range ? 'solid' : 'outline'"
                    :aria-pressed="days === range"
                    :class="styles.segment(days === range)"
                    @click="range = days"
                >
                    {{ days }}d
                </Clickable.Button>
            </fieldset>
        </template>
        <span :class="styles.figure">
            <span :class="styles.value">
                {{ traffic.total.toLocaleString("en-US") }}
            </span>
            <span :class="styles.change(traffic.change)">
                {{ formatChange(traffic.change) }} on the {{ range }} days before
            </span>
        </span>
        <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            role="img"
            :aria-label="`Sessions per day over the last ${range} days`"
            :class="styles.chart"
        >
            <path :d="`${line} L100,40 L0,40 Z`" :class="styles.area" />
            <path :d="line" :class="styles.line" />
        </svg>
        <span :class="styles.axis">
            <span>{{ range }} days ago</span>
            <span>Today</span>
        </span>
    </Card>
    <Card v-else-if="id === 'channels'" id="channels" title="Channels">
        <template #controls>
            <select v-model="metric" aria-label="Metric" :class="styles.select">
                <option
                    v-for="entry in METRICS"
                    :key="entry.key"
                    :value="entry.key"
                >
                    {{ entry.title }}
                </option>
            </select>
        </template>
        <ol :aria-label="`${metricTitle} by channel`" :class="styles.bars">
            <li v-for="row in rows" :key="row.name" :class="styles.bar">
                <span :class="styles.barName">{{ row.name }}</span>
                <span :class="styles.track">
                    <!-- the bar's length is the data's: a width, not a look -->
                    <span
                        :class="styles.fill"
                        :style="{ inlineSize: `${(row[metric] / max) * 100}%` }"
                    />
                </span>
                <span :class="styles.barValue">
                    {{ formatMetric(metric, row[metric]) }}
                </span>
            </li>
        </ol>
    </Card>
    <Card v-else-if="id === 'pages'" id="pages" title="Top pages">
        <div :class="styles.scroll">
            <table :class="styles.table">
                <thead>
                    <tr>
                        <th :class="styles.th">Page</th>
                        <th :class="styles.thEnd">Views</th>
                        <th :class="styles.thEnd">Change</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="page in PAGES" :key="page.path" :class="styles.row">
                        <td :class="styles.path">{{ page.path }}</td>
                        <td :class="styles.number">
                            {{ page.views.toLocaleString("en-US") }}
                        </td>
                        <td :class="styles.cellChange(page.change)">
                            {{ formatChange(page.change) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </Card>
    <Card v-else :id="id" :title="content.title">
        <span :class="styles.figure">
            <span :class="styles.value">{{ content.value }}</span>
            <span :class="styles.change(content.change)">
                {{ formatChange(content.change) }}
            </span>
        </span>
        <svg
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            :class="styles.sparkline"
        >
            <path :d="sparkline(content.points)" />
        </svg>
    </Card>
</template>
