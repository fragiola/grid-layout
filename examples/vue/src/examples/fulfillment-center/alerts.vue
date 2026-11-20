<script setup lang="ts">
import { CircleAlert, Info, OctagonAlert } from "@lucide/vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import {
    type Alert,
    formatClock,
    SEVERITY_LABELS,
} from "../_kit/fulfillment";
import Card from "./card.vue";
import * as styles from "./styles";

/**
 * The alerts feed, newest first. A critical alert nobody acknowledged sits above it, with the
 * button that acknowledges it; the app grows the tile while it waits (see index.vue).
 */
const props = defineProps<{
    alerts: readonly Alert[];
    critical: Alert | undefined;
}>();
const emit = defineEmits<{ acknowledge: [alertId: number] }>();

/** Each severity's icon: with its word, a severity never relies on colour alone. */
const ICONS = {
    info: Info,
    warning: CircleAlert,
    critical: OctagonAlert,
} as const;

const open = computed(
    () => props.alerts.filter((alert) => !alert.acknowledged).length,
);
</script>

<template>
    <Card
        id="alerts"
        title="Alerts"
        :aside="`${open} open`"
        :data-critical="critical ? '' : undefined"
    >
        <template v-if="critical">
            <span :class="styles.criticalStripe" />
            <div role="alert" :class="styles.critical">
                <span :class="styles.criticalTitle">
                    <OctagonAlert
                        aria-hidden="true"
                        :class="styles.criticalIcon"
                    />
                    Critical · {{ formatClock(critical.at) }}
                </span>
                <span :class="styles.criticalMessage">{{
                    critical.message
                }}</span>
                <Clickable.Button
                    size="sm"
                    variant="solid"
                    :class="styles.acknowledge"
                    @click="emit('acknowledge', critical.id)"
                >
                    Acknowledge
                </Clickable.Button>
            </div>
        </template>
        <ol aria-label="Alert feed" :class="styles.alerts">
            <li
                v-for="alert in alerts"
                :key="alert.id"
                :data-severity="alert.severity"
                :class="styles.alert(alert.acknowledged)"
            >
                <span :class="styles.badge(alert.severity)">
                    <component
                        :is="ICONS[alert.severity]"
                        aria-hidden="true"
                        :class="styles.badgeIcon"
                    />
                    {{ SEVERITY_LABELS[alert.severity] }}
                </span>
                <span :class="styles.alertMessage">{{ alert.message }}</span>
                <span :class="styles.alertTime">{{
                    formatClock(alert.at)
                }}</span>
            </li>
        </ol>
    </Card>
</template>
