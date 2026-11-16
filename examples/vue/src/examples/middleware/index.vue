<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import Guard from "./guard.vue";
import Reserved from "./reserved.vue";
import type { Refusal } from "./rules";
import * as styles from "./styles";

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 2, h: 2 },
    { id: "latency", x: 2, y: 2, w: 6, h: 2 },
    { id: "uptime", x: 0, y: 4, w: 12, h: 2 },
];

// Two app rules as middleware (`model.use`): the reserved area stays empty, and a row holds three
// widgets at most. Each runs the command first (`next()`), reads the layout it would settle into
// (pushes included) and vetoes it when a rule breaks. A drag asks the model at every cell (a dry
// run through the same middleware), so a refused landing shows the item going back, and the drop
// changes nothing; the log below says why. From the keyboard, a refused step is simply not taken.
// Free placement (`noCompactor`): nothing floats up into the reserved area on its own.
const log = ref<readonly LogLine<Refusal>[]>([]);
const refused = (refusal: Refusal) => {
    log.value = prepend(log.value, refusal, 20);
};
</script>

<template>
    <div :class="styles.frame">
        <GridLayout.Root
            :default-layout="LAYOUT"
            :compactor="noCompactor"
            :row-height="48"
            :gap="[10, 10]"
            aria-label="Dashboard with rules"
            :class="styles.root"
        >
            <Guard @refused="refused" />
            <Reserved />
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
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
        <section aria-labelledby="refused-title" :class="styles.panel">
            <h2 id="refused-title" :class="styles.panelTitle">Refused moves</h2>
            <ol role="log" aria-label="Refused moves" :class="styles.log">
                <li v-if="log.length === 0" :class="styles.empty">
                    Drag a widget into the reserved area, or a fourth one onto the first row.
                </li>
                <li v-for="{ key, entry } in log" :key="key" :class="styles.line">
                    <span :class="styles.lineHead">
                        {{ widget(entry.itemId).title }} {{ entry.where }}
                    </span>
                    {{ entry.reason }}
                </li>
            </ol>
        </section>
    </div>
</template>
