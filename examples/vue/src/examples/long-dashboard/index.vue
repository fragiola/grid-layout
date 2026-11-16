<script setup lang="ts">
import { GridLayout, type Layout } from "@fragiola/grid-layout-vue";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

/** Every widget twice over, three to a row: far taller than the frame. */
const LAYOUT: Layout = [...WIDGETS, ...WIDGETS].map((entry, index) => ({
    id: index < WIDGETS.length ? entry.id : `${entry.id}-2`,
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 2,
    w: 4,
    h: 2,
}));

const content = (id: string) => widget(id.replace(/-2$/, ""));
const title = (id: string) =>
    id.endsWith("-2") ? `${content(id).title} (2)` : content(id).title;

// The frame scrolls, not the page. Near its top or bottom edge a widget held there (or a corner
// pulled there) scrolls it, faster the closer to the edge (R6), so a widget can be carried from
// the first row to the last in one gesture. `autoScroll` sets the zone and the speed.
</script>

<template>
    <div :class="styles.frame" data-testid="scroller">
        <GridLayout.Root
            :default-layout="LAYOUT"
            :row-height="52"
            :gap="[12, 12]"
            :auto-scroll="{ threshold: 48, speed: 24 }"
            aria-label="Long dashboard"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="title(item.id)"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ title(item.id) }}</span>
                    <span :class="styles.value">{{ content(item.id).value }}</span>
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${title(item.id)}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
