<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { forget, load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:responsive-persistence";
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

/**
 * Every breakpoint's default layout, the widgets packed in reading order in its columns: given
 * whole, so nothing is generated (and saved) before anyone moves anything.
 */
function defaults(): Record<string, Layout> {
    const ids = dashboard().map((item) => item.id);
    return Object.fromEntries(
        Object.entries(COLS).map(([name, cols]) => {
            const w = Math.min(4, cols);
            const perRow = Math.floor(cols / w);
            return [
                name,
                ids.map((id, index) => ({
                    id,
                    x: (index % perRow) * w,
                    y: Math.floor(index / perRow) * 2,
                    w,
                    h: 2,
                })),
            ];
        }),
    );
}

/** The saved layouts, if the grid can use them: storage holds whatever was written. */
function saved(): Record<string, Layout> | undefined {
    const layouts = load<Record<string, Layout>>(KEY);
    if (!layouts || typeof layouts !== "object") return undefined;
    const usable = Object.entries(layouts).every(
        ([name, layout]) =>
            Object.hasOwn(BREAKPOINTS, name) &&
            layoutProblems(layout).length === 0,
    );
    return usable ? layouts : undefined;
}

// Persistence is the app's (D14): `@layout-change` tells every breakpoint's layout with the
// active one, so saving the map keeps each breakpoint as it was left. Every breakpoint's default
// is given, so none is generated (a generated one is told, and would be saved, at once). Reset
// forgets them and starts a new grid from the defaults.
const run = ref(0);
// read once: `defaultLayouts` is read when a grid starts
const first = saved();
const start = ref(first ?? defaults());
const status = ref(first ? "Restored the saved layouts" : "The default layouts");
const reset = () => {
    forget(KEY);
    start.value = defaults();
    status.value = "Back to the default layouts";
    run.value += 1;
};
const keep = (_layout: Layout, layouts: Readonly<Record<string, Layout>>) => {
    status.value = save(KEY, layouts)
        ? `Saved ${Object.keys(layouts).length} layouts`
        : "Could not save (storage is blocked)";
};
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <p :class="styles.note" aria-live="polite">{{ status }}</p>
            <Clickable.Button size="sm" variant="outline" @click="reset">
                Reset
            </Clickable.Button>
        </div>
        <GridLayout.Root
            :key="run"
            :breakpoints="BREAKPOINTS"
            :cols="COLS"
            :default-layouts="start"
            :row-height="52"
            :gap="[12, 12]"
            aria-label="Saved responsive dashboard"
            :class="styles.root"
            @layout-change="keep"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
