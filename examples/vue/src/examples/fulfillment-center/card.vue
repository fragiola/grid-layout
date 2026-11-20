<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { GripVertical } from "@lucide/vue";
import * as styles from "./styles";

/**
 * A widget's frame: its header is the grip it moves by (and its tab stop), with a short reading
 * beside it (`aside`); the corner resizes it. Other attributes (`data-critical`) go to the item.
 */
defineProps<{ id: string; title: string; aside?: string }>();
</script>

<template>
    <GridLayout.Item :item-id="id" :aria-label="title" :class="styles.item">
        <span :class="styles.header">
            <GridLayout.DragHandle
                :aria-label="`Move ${title}`"
                :class="styles.handle"
            >
                <GripVertical aria-hidden="true" :class="styles.grip" />
                <span :class="styles.title">{{ title }}</span>
            </GridLayout.DragHandle>
            <span v-if="aside !== undefined" :class="styles.aside">{{
                aside
            }}</span>
        </span>
        <slot />
        <GridLayout.ResizeHandle
            side="bottom-end"
            :aria-label="`Resize ${title}`"
            :class="styles.resizeHandle"
        />
    </GridLayout.Item>
</template>
