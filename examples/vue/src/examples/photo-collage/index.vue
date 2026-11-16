<script setup lang="ts">
import { aspectRatio, GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { wrapCompactor } from "@fragiola/grid-layout-vue/compactors";
import { Shuffle } from "@lucide/vue";
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { seeded } from "../_kit/layouts";
import KeepRatios from "./keep-ratios.vue";
import PhotoItem from "./photo-item.vue";
import { PHOTOS, type Photo } from "./photos";
import * as styles from "./styles";

/**
 * The photos in `order`, one per row: the wrap compactor flows them into lines in that order
 * when the grid starts. Each keeps its ratio through its own `aspectRatio` constraint.
 */
function album(order: readonly Photo[]): Layout {
    return order.map((photo, index) => ({
        id: photo.id,
        x: 0,
        y: index,
        w: photo.w,
        h: 8,
        minW: 2,
        constraints: [{ name: "aspectRatio", args: [photo.ratio] }],
    }));
}

/** The album in a new order, the same for the same seed. */
function shuffled(seed: number): Photo[] {
    const random = seeded(seed);
    const order = [...PHOTOS];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j] as Photo, order[i] as Photo];
    }
    return order;
}

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]));

// read when the grid is created: a new registry needs a new grid (a `key`)
const registry = { aspectRatio };

// A photo album laid out as a collage: the wrap compactor (from `/compactors`) flows the photos
// in reading order, like words, each keeping its own ratio. Drag a photo between two others and
// the ones after it move along; resize one and the flow makes room. Shuffle starts a new grid
// from another order.
const seed = ref(0);
const start = computed(() =>
    album(seed.value === 0 ? PHOTOS : shuffled(seed.value)),
);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.heading">Summer in Porto</span>
            <span :class="styles.count">{{ PHOTOS.length }} photos</span>
            <Clickable.Button size="sm" variant="outline" @click="seed += 1">
                <Shuffle aria-hidden="true" />
                Shuffle
            </Clickable.Button>
        </div>
        <!-- a new grid per order: `default-layout` is read when a grid starts -->
        <GridLayout.Root
            :key="seed"
            :default-layout="start"
            :compactor="wrapCompactor"
            :constraint-registry="registry"
            :row-height="10"
            :gap="[8, 8]"
            aria-label="Album"
            :class="styles.root"
        >
            <KeepRatios />
            <GridLayout.Items v-slot="{ item }">
                <PhotoItem v-if="byId.has(item.id)" :photo="byId.get(item.id)!" />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
