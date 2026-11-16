<script setup lang="ts">
import { GridLayout } from "@fragiola/grid-layout-vue";
import { ref } from "vue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import Announcer from "./announcer.vue";
import * as styles from "./styles";

const layout = dashboard();

const KEYS = [
    ["Space", "grab or drop"],
    ["Arrows", "move"],
    ["Shift + arrows", "resize"],
    ["Escape", "put back"],
];

// Every item is a tab stop. Space or Enter grabs it, the arrows move it a cell at a time and
// Shift with the arrows resizes it, Space or Enter drops it, Escape puts it back. The words a
// screen reader hears are the app's: the grid tells each step, and this example says it in a
// live region.
const message = ref("Tab to a widget, then press Space to grab it.");
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.panel">
            <ul :class="styles.keys" aria-label="Keys">
                <li v-for="[key, does] in KEYS" :key="key" :class="styles.keyRow">
                    <kbd :class="styles.key">{{ key }}</kbd>
                    {{ does }}
                </li>
            </ul>
            <p role="status" :class="styles.status">{{ message }}</p>
        </div>
        <GridLayout.Root
            :default-layout="layout"
            :row-height="56"
            :gap="[12, 12]"
            aria-label="Dashboard"
            aria-describedby="keyboard-help"
            :class="styles.root"
        >
            <Announcer @message="message = $event" />
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="widget(item.id).title"
                    aria-roledescription="movable widget"
                    :class="styles.item"
                >
                    <span :class="styles.title">{{ widget(item.id).title }}</span>
                    <span :class="styles.value">{{ widget(item.id).value }}</span>
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
        <p id="keyboard-help" :class="styles.hint">
            Space grabs a widget; the arrows move it, Shift and the arrows
            resize it.
        </p>
    </div>
</template>
