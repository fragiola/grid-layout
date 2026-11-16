<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { Plus, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

// The layout in the app's state (controlled): adding is a new item in it, at no row in
// particular (`y: Infinity`, below everything: compaction lifts it where there is room);
// removing is the item gone from it. The remove button is a control: pressing it never drags.
const layout = ref<Layout>(dashboard().slice(0, 4));
const next = computed(() =>
    WIDGETS.find((entry) => !layout.value.some((item) => item.id === entry.id)),
);
const add = () => {
    if (!next.value) return;
    layout.value = [
        ...layout.value,
        { id: next.value.id, x: 0, y: Number.POSITIVE_INFINITY, w: 4, h: 2 },
    ];
};
const remove = (id: string) => {
    layout.value = layout.value.filter((item) => item.id !== id);
};
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <p :class="styles.note">{{ layout.length }} widgets</p>
            <Clickable.Button size="sm" :disabled="!next" @click="add">
                <Plus aria-hidden="true" />
                Add {{ next ? next.title : "widget" }}
            </Clickable.Button>
        </div>
        <GridLayout.Root
            v-model:layout="layout"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Dashboard"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.header">
                        <span :class="styles.title">{{ widget(item.id).title }}</span>
                        <Clickable.Button
                            size="sm"
                            variant="icon"
                            :aria-label="`Remove ${widget(item.id).title}`"
                            @click="remove(item.id)"
                        >
                            <X aria-hidden="true" />
                        </Clickable.Button>
                    </span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${widget(item.id).title}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
