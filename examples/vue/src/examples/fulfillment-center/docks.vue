<script setup lang="ts">
import { Truck } from "@lucide/vue";
import { computed } from "vue";
import { DOCK_STATUS_LABELS, type Dock } from "../_kit/fulfillment";
import Card from "./card.vue";
import * as styles from "./styles";

/** The dock doors, each with its truck's carrier and load: as many to a row as the tile fits. */
const props = defineProps<{ docks: readonly Dock[] }>();

const loading = computed(
    () => props.docks.filter((dock) => dock.status === "loading").length,
);
</script>

<template>
    <Card id="docks" title="Dock doors" :aside="`${loading} loading`">
        <ul aria-label="Doors" :class="styles.doors">
            <li
                v-for="dock in docks"
                :key="dock.id"
                :aria-label="dock.name"
                :data-status="dock.status"
                :class="styles.door(dock.status)"
            >
                <span :class="styles.doorTop">
                    <span :class="styles.doorName">{{ dock.name }}</span>
                    <span :class="styles.doorStatus">
                        <Truck
                            v-if="dock.status !== 'empty'"
                            aria-hidden="true"
                            :class="styles.truck"
                        />
                        {{ DOCK_STATUS_LABELS[dock.status] }}
                    </span>
                </span>
                <span :class="styles.doorBottom">
                    <span :class="styles.carrierName">{{
                        dock.carrier ?? "No truck"
                    }}</span>
                    <span v-if="dock.carrier" :class="styles.load"
                        >{{ Math.round(dock.progress * 100) }}%</span
                    >
                </span>
                <span aria-hidden="true" :class="styles.track">
                    <!-- the truck's load is the data's: a width, not a look -->
                    <span
                        :class="styles.fill"
                        :style="{ inlineSize: `${dock.progress * 100}%` }"
                    />
                </span>
            </li>
        </ul>
    </Card>
</template>
