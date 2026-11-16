<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import Artwork from "../_kit/artwork.vue";
import type { Project } from "./portfolio";
import * as styles from "./styles";

defineProps<{ project: Project }>();
</script>

<template>
    <GridLayout.Item
        :item-id="project.id"
        :aria-label="project.title"
        :class="styles.tile(project.tone)"
    >
        <Artwork
            :seed="project.seed"
            :ratio="project.ratio"
            :motif="project.motif"
            :class="styles.artwork"
            :layers="styles.layers"
        />
        <span :class="styles.caption">
            <span :class="styles.captionTitle">{{ project.title }}</span>
            <span :class="styles.captionText">{{ project.kind }}</span>
        </span>
        <GridLayout.ResizeHandle
            side="bottom-end"
            :aria-label="`Resize ${project.title}`"
            :class="styles.resizeHandle"
        />
    </GridLayout.Item>
</template>
