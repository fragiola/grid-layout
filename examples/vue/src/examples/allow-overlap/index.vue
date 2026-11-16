<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-vue";
import * as styles from "./styles";

// allowOverlap: nothing is pushed and nothing settles, so items stack wherever they are dropped,
// like notes on a board. The one dragged last stays on top only while it is held: what is drawn
// over what afterwards is the app's (here, the layout's order).
const notes: Layout = [
    { id: "Call the supplier", x: 0, y: 0, w: 3, h: 2 },
    { id: "Review the Q3 plan", x: 2, y: 1, w: 3, h: 2 },
    { id: "Book the venue", x: 6, y: 0, w: 3, h: 2 },
    { id: "Ship the release", x: 7, y: 1, w: 3, h: 3 },
];
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="notes"
            :compactor="noCompactor"
            allow-overlap
            :row-height="48"
            :gap="[10, 10]"
            aria-label="Notes"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="item.id"
                    :class="styles.item"
                >
                    {{ item.id }}
                    <GridLayout.ResizeHandle
                        side="bottom-end"
                        :aria-label="`Resize ${item.id}`"
                        :class="styles.resizeHandle"
                    />
                </GridLayout.Item>
            </GridLayout.Items>
        </GridLayout.Root>
    </div>
</template>
