<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import Artwork from "../_kit/artwork.vue";
import type { Photo } from "./photos";
import * as styles from "./styles";

defineProps<{ photo: Photo }>();
</script>

<template>
    <GridLayout.Item
        :item-id="photo.id"
        :aria-label="photo.caption"
        :class="styles.photo(photo.tone)"
    >
        <Artwork
            :seed="photo.seed"
            :ratio="photo.ratio"
            :class="styles.artwork"
            :layers="styles.layers"
        />
        <span :class="styles.caption">{{ photo.caption }}</span>
        <GridLayout.ResizeHandle
            side="bottom-end"
            :aria-label="`Resize ${photo.caption}`"
            :class="styles.resizeHandle"
        />
    </GridLayout.Item>
</template>
