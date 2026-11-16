<script setup lang="ts">
import { NOTE, ORDERS, type WidgetKind } from "../_kit/catalogue";
import { formatChange, sparkline, WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

/** What a widget shows, by its kind: demo content, the app's. */
defineProps<{ kind: WidgetKind }>();

const revenue = WIDGETS[0];
</script>

<template>
    <span v-if="kind === 'kpi'" :class="styles.kpi">
        <span :class="styles.value">{{ revenue?.value }}</span>
        <span :class="styles.change">
            {{ formatChange(revenue?.change ?? 0) }}
        </span>
    </span>
    <svg
        v-else-if="kind === 'chart'"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        aria-hidden="true"
        :class="styles.chart"
    >
        <path :d="sparkline(revenue?.points ?? [0, 1])" />
    </svg>
    <table v-else-if="kind === 'table'" :class="styles.table">
        <tbody>
            <tr v-for="order in ORDERS" :key="order.id" :class="styles.row">
                <td>{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td :class="styles.total">{{ order.total }}</td>
            </tr>
        </tbody>
    </table>
    <p v-else :class="styles.note">{{ NOTE }}</p>
</template>
