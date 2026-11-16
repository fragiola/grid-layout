<script setup lang="ts">
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { X } from "@lucide/vue";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import AddWidget from "./add-widget.vue";
import CurrentBreakpoint from "./current-breakpoint.vue";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

// lg and sm are given; md, xs and xxs are generated the first time the grid is that wide, from
// the nearest larger breakpoint's layout (R3), and kept from then on
const LAYOUTS: Record<string, Layout> = {
    lg: dashboard(),
    sm: [
        { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
        { id: "orders", x: 3, y: 0, w: 3, h: 2 },
        { id: "visitors", x: 0, y: 2, w: 6, h: 2 },
        { id: "conversion", x: 0, y: 4, w: 2, h: 2 },
        { id: "latency", x: 2, y: 4, w: 4, h: 2 },
        { id: "uptime", x: 0, y: 6, w: 6, h: 2 },
    ],
};

const GAP = {
    lg: [12, 12],
    md: [12, 12],
    sm: [10, 10],
    xs: [8, 8],
    xxs: [8, 8],
} as const;

// The breakpoint is the grid's own width's, never the window's (R1): resize the frame and the
// grid takes the widest breakpoint whose minimum it reaches, with that breakpoint's columns and
// layout. A widget added or removed on one breakpoint is on the others too.
const gridLayoutRef = useGridLayoutRef();
const remove = (id: string) =>
    gridLayoutRef.current?.model.run("item.remove", { itemId: id });
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <CurrentBreakpoint :grid-layout-ref="gridLayoutRef" />
            <AddWidget :grid-layout-ref="gridLayoutRef" />
        </div>
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :breakpoints="BREAKPOINTS"
            :cols="COLS"
            :default-layouts="LAYOUTS"
            :row-height="52"
            :gap="GAP"
            aria-label="Responsive dashboard"
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
                </GridLayout.Item>
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
