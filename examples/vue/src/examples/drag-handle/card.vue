<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { GripVertical, RefreshCw } from "@lucide/vue";
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const props = defineProps<{ id: string }>();
const content = computed(() => widget(props.id));
const refreshed = ref(0);
</script>

<template>
    <GridLayout.Item
        :item-id="id"
        :aria-label="content.title"
        :class="styles.item"
    >
        <span :class="styles.header">
            <GridLayout.DragHandle
                :aria-label="`Move ${content.title}`"
                aria-roledescription="drag handle"
                :class="styles.handle"
            >
                <GripVertical aria-hidden="true" />
            </GridLayout.DragHandle>
            <span :class="styles.title">{{ content.title }}</span>
            <Clickable.Button
                size="sm"
                variant="icon"
                :aria-label="`Refresh ${content.title}`"
                @click="refreshed += 1"
            >
                <RefreshCw aria-hidden="true" />
            </Clickable.Button>
        </span>
        <span :class="styles.value">{{ content.value }}</span>
        <input
            :aria-label="`Note on ${content.title}`"
            placeholder="Add a note"
            :class="styles.field"
        />
        <span :class="styles.note">Refreshed {{ refreshed }} times</span>
    </GridLayout.Item>
</template>
