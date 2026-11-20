<script setup lang="ts">
import { CircleAlert, CircleCheck, CircleX } from "@lucide/vue";
import {
    type Carrier,
    formatCount,
    formatShare,
    SLA_LABELS,
} from "../_kit/fulfillment";
import Card from "./card.vue";
import * as styles from "./styles";

/** Each carrier of the shift against its SLA, its status in a word and an icon. */
defineProps<{ carriers: readonly Carrier[] }>();

/** Each status's icon: with its word, a status never relies on colour alone. */
const ICONS = {
    "on-track": CircleCheck,
    "at-risk": CircleAlert,
    breach: CircleX,
} as const;
</script>

<template>
    <Card id="carriers" title="Carrier SLA">
        <div :class="styles.scroll">
            <table :class="styles.table">
                <thead>
                    <tr>
                        <th :class="styles.th">Carrier</th>
                        <th :class="styles.thEnd">Cut-off</th>
                        <th :class="styles.thEnd">Shipped</th>
                        <th :class="styles.thEnd">On time</th>
                        <th :class="styles.thEnd">SLA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="carrier in carriers"
                        :key="carrier.id"
                        :class="styles.row"
                    >
                        <td :class="styles.cell">{{ carrier.name }}</td>
                        <td :class="styles.number">{{ carrier.cutoff }}</td>
                        <td :class="styles.number">
                            {{ formatCount(carrier.shipped) }}
                        </td>
                        <td :class="styles.number">
                            {{ formatShare(carrier.onTime) }}
                        </td>
                        <td :class="styles.number">
                            <span :class="styles.badge(carrier.status)">
                                <component
                                    :is="ICONS[carrier.status]"
                                    aria-hidden="true"
                                    :class="styles.badgeIcon"
                                />
                                {{ SLA_LABELS[carrier.status] }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </Card>
</template>
