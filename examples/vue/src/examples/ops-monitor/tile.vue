<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import type { Component } from "vue";
import { type Service, STATUS_LABELS } from "../_kit/datasets";
import * as styles from "./styles";

/** A service's tile: its status in a word and an icon (`icon`) as well as a colour. */
defineProps<{ service: Service; icon: Component }>();
</script>

<template>
    <GridLayout.Item
        :item-id="service.id"
        :aria-label="service.name"
        :data-status="service.status"
        :class="styles.tile"
    >
        <span :class="styles.stripe(service.status)" />
        <span :class="styles.name">{{ service.name }}</span>
        <span :class="styles.badge(service.status)">
            <component :is="icon" aria-hidden="true" :class="styles.badgeIcon" />
            {{ STATUS_LABELS[service.status] }}
        </span>
        <span :class="styles.metrics">
            {{ service.p95 }} ms · {{ service.errors }}% err
        </span>
    </GridLayout.Item>
</template>
