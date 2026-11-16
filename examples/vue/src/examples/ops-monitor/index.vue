<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { CircleAlert, CircleCheck, CircleX, Radio } from "@lucide/vue";
import {
    countByStatus,
    SERVICES,
    type ServiceStatus,
    STATUS_LABELS,
} from "../_kit/datasets";
import * as styles from "./styles";
import Tile from "./tile.vue";

const COLS = 12;

// The title bar and the summary are statics: pinned at the top, never dragged and never pushed.
// Under them, one small tile per service, six to a row.
const layout: Layout = [
    { id: "title", x: 0, y: 0, w: COLS, h: 2, static: true },
    { id: "summary", x: 0, y: 2, w: COLS, h: 3, static: true },
    ...SERVICES.map((service, index) => ({
        id: service.id,
        x: (index % 6) * 2,
        y: 5 + Math.floor(index / 6) * 3,
        w: 2,
        h: 3,
    })),
];

const byId = new Map(SERVICES.map((service) => [service.id, service]));
const counts = countByStatus(SERVICES);
const STATUSES = Object.keys(STATUS_LABELS) as ServiceStatus[];

/** Each status's icon: with its word, a status never relies on colour alone. */
const ICONS = {
    ok: CircleCheck,
    warn: CircleAlert,
    down: CircleX,
} as const;

// An operations console: dense tiles on small rows (24 px), each saying its service's status in
// a word and an icon as well as a colour. People arrange the tiles as they like; the header tiles
// are `static: true`, so a tile dropped on them settles below instead. Tiles only move here
// (`:resizable="false"`): their size is the monitor's.
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="layout"
            :cols="COLS"
            :row-height="24"
            :gap="[6, 6]"
            :resizable="false"
            aria-label="Services"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    v-if="item.id === 'title'"
                    item-id="title"
                    aria-label="Ops monitor"
                    :class="styles.titleBar"
                >
                    <Radio aria-hidden="true" :class="styles.icon" />
                    <span :class="styles.heading">Ops monitor</span>
                    <span :class="styles.meta">production · eu-west-1</span>
                    <span :class="styles.updated">Updated 12:04 UTC</span>
                </GridLayout.Item>
                <GridLayout.Item
                    v-else-if="item.id === 'summary'"
                    item-id="summary"
                    aria-label="Service summary"
                    :class="styles.summary"
                >
                    <span
                        v-for="status in STATUSES"
                        :key="status"
                        :class="styles.count(status)"
                    >
                        <component
                            :is="ICONS[status]"
                            aria-hidden="true"
                            :class="styles.countIcon"
                        />
                        <span :class="styles.countValue">{{ counts[status] }}</span>
                        <span :class="styles.countLabel">
                            {{ STATUS_LABELS[status] }}
                        </span>
                    </span>
                </GridLayout.Item>
                <Tile
                    v-else-if="byId.has(item.id)"
                    :service="byId.get(item.id)!"
                    :icon="ICONS[byId.get(item.id)!.status]"
                />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
