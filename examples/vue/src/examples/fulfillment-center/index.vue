<script setup lang="ts">
import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-vue";
import { Pause, Play, Warehouse } from "@lucide/vue";
import {
    onBeforeUnmount,
    onMounted,
    shallowRef,
    useTemplateRef,
    watch,
} from "vue";
import { Clickable } from "#/components/atoms/clickable";
import {
    createFulfillmentFeed,
    formatClock,
    formatCount,
    formatShare,
    prefersReducedMotion,
} from "../_kit/fulfillment";
import Alerts from "./alerts.vue";
import Backlog from "./backlog.vue";
import Carriers from "./carriers.vue";
import Docks from "./docks.vue";
import Kpi from "./kpi.vue";
import * as styles from "./styles";
import Throughput from "./throughput.vue";

const BREAKPOINTS = { lg: 900, md: 600, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 4 };

/** How many rows a critical alert adds to the alerts tile while it waits. */
const GROW = 4;

/** Every breakpoint's layout. The header is pinned (`static`); the widgets move by their grip. */
const LAYOUTS: Record<string, Layout> = {
    lg: [
        { id: "header", x: 0, y: 0, w: 12, h: 2, static: true },
        { id: "orders", x: 0, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
        { id: "pick-rate", x: 4, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
        { id: "on-time", x: 8, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
        { id: "throughput", x: 0, y: 5, w: 8, h: 6, minW: 3, minH: 4 },
        { id: "alerts", x: 8, y: 5, w: 4, h: 6, minW: 3, minH: 4 },
        { id: "docks", x: 0, y: 11, w: 12, h: 4, minW: 3, minH: 3 },
        { id: "backlog", x: 0, y: 15, w: 5, h: 6, minW: 3, minH: 4 },
        { id: "carriers", x: 5, y: 15, w: 7, h: 6, minW: 4, minH: 4 },
    ],
    md: [
        { id: "header", x: 0, y: 0, w: 8, h: 2, static: true },
        { id: "orders", x: 0, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
        { id: "pick-rate", x: 3, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
        { id: "on-time", x: 6, y: 2, w: 2, h: 3, minW: 2, minH: 2 },
        { id: "throughput", x: 0, y: 5, w: 8, h: 6, minW: 3, minH: 4 },
        { id: "alerts", x: 0, y: 11, w: 4, h: 6, minW: 3, minH: 4 },
        { id: "backlog", x: 4, y: 11, w: 4, h: 6, minW: 3, minH: 4 },
        { id: "docks", x: 0, y: 17, w: 8, h: 4, minW: 3, minH: 3 },
        { id: "carriers", x: 0, y: 21, w: 8, h: 6, minW: 4, minH: 4 },
    ],
    sm: [
        { id: "header", x: 0, y: 0, w: 4, h: 2, static: true },
        { id: "orders", x: 0, y: 2, w: 2, h: 3, minH: 2 },
        { id: "pick-rate", x: 2, y: 2, w: 2, h: 3, minH: 2 },
        { id: "on-time", x: 0, y: 5, w: 4, h: 3, minH: 2 },
        { id: "alerts", x: 0, y: 8, w: 4, h: 6, minH: 4 },
        { id: "throughput", x: 0, y: 14, w: 4, h: 6, minH: 4 },
        { id: "backlog", x: 0, y: 20, w: 4, h: 6, minH: 4 },
        { id: "docks", x: 0, y: 26, w: 4, h: 6, minH: 3 },
        { id: "carriers", x: 0, y: 32, w: 4, h: 6, minH: 4 },
    ],
};

/**
 * Grows the alerts tile while a critical alert waits and gives the rows back once it is
 * acknowledged, as commands on the model (`item.resize`): the tiles below are pushed, then
 * settle back up. `grown` remembers the breakpoint it grew on. During a gesture it waits: the
 * next tick tries again.
 */
function fitAlerts(
    grid: GridLayoutRef["current"],
    critical: boolean,
    grown: { current: string | undefined },
) {
    if (!grid || grid.engine.get("gesture")) return;
    if (critical && grown.current === undefined) {
        const item = grid.model.get("item-by", { itemId: "alerts" });
        if (!item) return;
        const result = grid.model.run("item.resize", {
            itemId: "alerts",
            w: item.w,
            h: item.h + GROW,
        });
        if (result.ok) grown.current = grid.model.get("breakpoint");
    } else if (!critical && grown.current !== undefined) {
        const breakpoint = grown.current;
        grown.current = undefined;
        const item = grid.model
            .get("layout-by", { breakpoint })
            ?.find((entry) => entry.id === "alerts");
        if (!item) return;
        grid.model.run("item.resize", {
            itemId: "alerts",
            w: item.w,
            h: Math.max(item.h - GROW, item.minH ?? 1),
            breakpoint,
        });
    }
}

// A fulfillment center's live operations: KPI tiles, two charts drawn to their tile's size, the
// dock doors, the carriers against their SLA and an alerts feed, all from a seeded simulation
// that ticks twice a second. Widgets move by their header's grip and resize from their corner
// while the numbers keep moving. A critical alert grows its tile through the model, pushing the
// others down, and the tile settles back once it is acknowledged. The feed starts paused when
// the reader asks for less motion, and stops while the page is hidden or the dashboard off screen.
const feed = createFulfillmentFeed();
const shift = shallowRef(feed.snapshot);
const unsubscribe = feed.subscribe(() => {
    shift.value = feed.snapshot;
});
const frame = useTemplateRef<HTMLElement>("frame");
const gridLayoutRef = useGridLayoutRef();
const grown = { current: undefined as string | undefined };
let unwatch = () => {};

onMounted(() => {
    const element = frame.value;
    if (!element) return;
    if (!prefersReducedMotion(element.ownerDocument.defaultView)) feed.play();
    unwatch = feed.watch(element);
});
onBeforeUnmount(() => {
    unwatch();
    feed.pause();
    unsubscribe();
});

// every new snapshot: the alerts tile follows the critical alert
watch(shift, (next) =>
    fitAlerts(gridLayoutRef.current, next.critical !== undefined, grown),
);

const toggle = () => (shift.value.playing ? feed.pause() : feed.play());
</script>

<template>
    <div ref="frame" :class="styles.frame">
        <GridLayout.Root
            :grid-layout-ref="gridLayoutRef"
            :breakpoints="BREAKPOINTS"
            :cols="COLS"
            :default-layouts="LAYOUTS"
            :row-height="32"
            :gap="[12, 12]"
            aria-label="Fulfillment center"
            :class="styles.root"
        >
            <GridLayout.Items v-slot="{ item }">
                <GridLayout.Item
                    v-if="item.id === 'header'"
                    item-id="header"
                    aria-label="Shift"
                    :class="styles.topBar"
                >
                    <Warehouse aria-hidden="true" :class="styles.brandIcon" />
                    <span :class="styles.brand">
                        <span :class="styles.heading">Fulfillment center</span>
                        <span :class="styles.site">DC-04 Reno · shift B</span>
                    </span>
                    <time :class="styles.clock">{{
                        formatClock(shift.clock)
                    }}</time>
                    <span :class="styles.live(shift.playing)">{{
                        shift.playing ? "Live" : "Paused"
                    }}</span>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        :aria-label="
                            shift.playing ? 'Pause live data' : 'Play live data'
                        "
                        @click="toggle"
                    >
                        <Pause
                            v-if="shift.playing"
                            aria-hidden="true"
                            :class="styles.playIcon"
                        />
                        <Play v-else aria-hidden="true" :class="styles.playIcon" />
                        {{ shift.playing ? "Pause" : "Play" }}
                    </Clickable.Button>
                </GridLayout.Item>
                <Kpi
                    v-else-if="item.id === 'orders'"
                    id="orders"
                    title="Orders per minute"
                    :series="shift.orders"
                    :format="formatCount"
                />
                <Kpi
                    v-else-if="item.id === 'pick-rate'"
                    id="pick-rate"
                    title="Picks per hour"
                    :series="shift.pickRate"
                    :format="formatCount"
                />
                <Kpi
                    v-else-if="item.id === 'on-time'"
                    id="on-time"
                    title="On time"
                    :series="shift.onTime"
                    :format="formatShare"
                />
                <Throughput
                    v-else-if="item.id === 'throughput'"
                    :received="shift.orders"
                    :shipped="shift.shipped"
                />
                <Backlog
                    v-else-if="item.id === 'backlog'"
                    :backlog="shift.backlog"
                />
                <Docks v-else-if="item.id === 'docks'" :docks="shift.docks" />
                <Carriers
                    v-else-if="item.id === 'carriers'"
                    :carriers="shift.carriers"
                />
                <Alerts
                    v-else-if="item.id === 'alerts'"
                    :alerts="shift.alerts"
                    :critical="shift.critical"
                    @acknowledge="feed.acknowledge"
                />
            </GridLayout.Items>
            <GridLayout.Placeholder :class="styles.placeholder" />
        </GridLayout.Root>
    </div>
</template>
