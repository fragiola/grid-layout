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

const KEY = "grid-layout:save-restore";

/** The saved layout, if there is one the grid can use: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Persistence is the app's (D14): every committed change is saved, the saved layout is where the
// grid starts, and Reset forgets it and starts the grid again from the default.
const run = ref(0);
const start = ref<Layout>(saved() ?? dashboard());
const status = ref(
    saved() ? "Restored the saved layout" : "The default layout",
);
const reset = () => {
    forget(KEY);
    status.value = "Back to the default layout";
    start.value = dashboard();
    run.value += 1;
};
const persist = (layout: Layout) => {
    status.value = save(KEY, layout)
        ? "Saved"
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
        <!-- a new grid on reset: `default-layout` is read once, when a grid starts -->
        <GridLayout.Root
            :key="run"
            :default-layout="start"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Saved dashboard"
            :class="styles.root"
            @layout-change="persist"
        >
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
    </div>
</template>
