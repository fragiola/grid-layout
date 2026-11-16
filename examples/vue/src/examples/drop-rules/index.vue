<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-vue";
import { computed, ref } from "vue";
import DropVerdict from "./drop-verdict.vue";
import Rules from "./rules.vue";
import * as styles from "./styles";

const SOURCES = [
    { kind: "kpi", title: "KPI", rule: "anywhere free", w: 3, h: 2 },
    { kind: "clock", title: "Clock", rule: "one at most", w: 3, h: 2 },
    { kind: "banner", title: "Banner", rule: "shrinks to fit", w: 9, h: 1 },
] as const;

const START: Layout = [{ id: "kpi-0", x: 0, y: 0, w: 3, h: 2 }];

// Every drop is one `item.add` through the model's middleware, and the preview is its dry run:
// what the rules refuse shows refused (`data-drop-refused`, no placeholder), what they rewrite
// shows rewritten. Each source names its new item's id (`clock-2`), so the rules can tell kinds
// apart; the reason a rule gives is the app's to show.
const gridLayoutRef = useGridLayoutRef();
// the last refusal's reason: written by the rules, read when the view says a drop is refused
const reason = { current: "" };
const made = ref(1);
// refused, the grid turns (styles.ts): a computed tells only when it flips, not every preview
const view = useGridLayoutView(gridLayoutRef);
const refused = computed(() => view.value?.dropRefused ?? false);
</script>

<template>
    <div :class="styles.frame">
        <aside :class="styles.sidebar" aria-label="Widgets">
            <GridLayout.DragSource
                v-for="source in SOURCES"
                :key="source.kind"
                :grid-layout-ref="gridLayoutRef"
                :item-id="`${source.kind}-${made}`"
                :item="{ w: source.w, h: source.h, minW: 3 }"
                :aria-label="`${source.title}, ${source.rule}`"
                :class="styles.source"
            >
                <span :class="styles.sourceTitle">{{ source.title }}</span>
                <span :class="styles.sourceText">{{ source.rule }}</span>
            </GridLayout.DragSource>
            <DropVerdict :grid-layout-ref="gridLayoutRef" :reason="reason" />
        </aside>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :default-layout="START"
            :row-height="48"
            :gap="[12, 12]"
            aria-label="Dashboard with rules"
            :class="styles.root(refused)"
            @drop="made += 1"
        >
            <Rules :reason="reason" />
            <!-- the locked columns, drawn under the items: a picture of the rule, no part -->
            <div aria-hidden="true" :class="styles.locked">Locked</div>
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    :item-id="item.id"
                    :aria-label="item.id.replace('-', ' ')"
                    :class="styles.item"
                >
                    {{ item.id.replace("-", " ") }}
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
