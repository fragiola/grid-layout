"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { Pause, Play, Warehouse } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clickable } from "#/components/atoms/clickable";
import {
    createFulfillmentFeed,
    formatClock,
    formatCount,
    formatShare,
    prefersReducedMotion,
} from "../_kit/fulfillment";
import * as styles from "./styles";
import { Alerts, Backlog, Carriers, Docks, Kpi, Throughput } from "./widgets";

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
 * settle back up. `grown` holds, for each breakpoint the tile grew on, its height before; each
 * breakpoint shown while the alert waits grows too. A tile the reader resized meanwhile keeps
 * its size unless it is still as tall as grown. During a gesture it waits: the next tick tries
 * again.
 */
function fitAlerts(
    grid: GridLayoutRef["current"],
    critical: boolean,
    grown: Map<string, number>,
) {
    if (!grid || grid.engine.get("gesture")) return;
    if (critical) {
        const breakpoint = grid.model.get("breakpoint");
        const item = grid.model.get("item-by", { itemId: "alerts" });
        if (grown.has(breakpoint) || !item) return;
        const result = grid.model.run("item.resize", {
            itemId: "alerts",
            w: item.w,
            h: item.h + GROW,
        });
        if (result.ok) grown.set(breakpoint, item.h);
        return;
    }
    for (const [breakpoint, before] of grown) {
        const item = grid.model
            .get("layout-by", { breakpoint })
            ?.find((entry) => entry.id === "alerts");
        if (item && item.h >= before + GROW) {
            grid.model.run("item.resize", {
                itemId: "alerts",
                w: item.w,
                h: item.h - GROW,
                breakpoint,
            });
        }
    }
    grown.clear();
}

// A fulfillment center's live operations: KPI tiles, two charts drawn to their tile's size, the
// dock doors, the carriers against their SLA and an alerts feed, all from a seeded simulation
// that ticks twice a second. Widgets move by their header's grip and resize from their corner
// while the numbers keep moving. A critical alert grows its tile through the model, pushing the
// others down, and the tile settles back once it is acknowledged. The feed starts paused when
// the reader asks for less motion, and stops while the page is hidden or the dashboard off screen.
export default function FulfillmentCenter() {
    const [feed] = useState(() => createFulfillmentFeed());
    const shift = useSyncExternalStore(
        feed.subscribe,
        () => feed.snapshot,
        () => feed.snapshot,
    );
    const frame = useRef<HTMLDivElement>(null);
    const gridLayoutRef = useGridLayoutRef();
    const [grown] = useState(() => new Map<string, number>());

    useEffect(() => {
        const element = frame.current;
        if (!element) return;
        if (!prefersReducedMotion(element.ownerDocument.defaultView)) {
            feed.play();
        }
        const unwatch = feed.watch(element);
        return () => {
            unwatch();
            feed.pause();
        };
    }, [feed]);

    // every new snapshot: the alerts tile follows the critical alert
    useEffect(() => {
        fitAlerts(gridLayoutRef.current, shift.critical !== undefined, grown);
    }, [gridLayoutRef, shift, grown]);

    return (
        <div ref={frame} className={styles.frame}>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                defaultLayouts={LAYOUTS}
                rowHeight={32}
                gap={[12, 12]}
                aria-label="Fulfillment center"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        switch (item.id) {
                            case "header":
                                return (
                                    <GridLayout.Item
                                        key="header"
                                        itemId="header"
                                        aria-label="Shift"
                                        className={styles.topBar}
                                    >
                                        <Warehouse
                                            aria-hidden="true"
                                            className={styles.brandIcon}
                                        />
                                        <span className={styles.brand}>
                                            <span className={styles.heading}>
                                                Fulfillment center
                                            </span>
                                            <span className={styles.site}>
                                                DC-04 Reno · shift B
                                            </span>
                                        </span>
                                        <time className={styles.clock}>
                                            {formatClock(shift.clock)}
                                        </time>
                                        <span
                                            className={styles.live(
                                                shift.playing,
                                            )}
                                        >
                                            {shift.playing ? "Live" : "Paused"}
                                        </span>
                                        <Clickable.Button
                                            size="sm"
                                            variant="outline"
                                            aria-label={
                                                shift.playing
                                                    ? "Pause live data"
                                                    : "Play live data"
                                            }
                                            onClick={() =>
                                                shift.playing
                                                    ? feed.pause()
                                                    : feed.play()
                                            }
                                        >
                                            {shift.playing ? (
                                                <Pause
                                                    aria-hidden="true"
                                                    className={styles.playIcon}
                                                />
                                            ) : (
                                                <Play
                                                    aria-hidden="true"
                                                    className={styles.playIcon}
                                                />
                                            )}
                                            {shift.playing ? "Pause" : "Play"}
                                        </Clickable.Button>
                                    </GridLayout.Item>
                                );
                            case "orders":
                                return (
                                    <Kpi
                                        key="orders"
                                        id="orders"
                                        title="Orders per minute"
                                        series={shift.orders}
                                        format={formatCount}
                                    />
                                );
                            case "pick-rate":
                                return (
                                    <Kpi
                                        key="pick-rate"
                                        id="pick-rate"
                                        title="Picks per hour"
                                        series={shift.pickRate}
                                        format={formatCount}
                                    />
                                );
                            case "on-time":
                                return (
                                    <Kpi
                                        key="on-time"
                                        id="on-time"
                                        title="On time"
                                        series={shift.onTime}
                                        format={formatShare}
                                    />
                                );
                            case "throughput":
                                return (
                                    <Throughput
                                        key="throughput"
                                        received={shift.orders}
                                        shipped={shift.shipped}
                                    />
                                );
                            case "backlog":
                                return (
                                    <Backlog
                                        key="backlog"
                                        backlog={shift.backlog}
                                    />
                                );
                            case "docks":
                                return (
                                    <Docks key="docks" docks={shift.docks} />
                                );
                            case "carriers":
                                return (
                                    <Carriers
                                        key="carriers"
                                        carriers={shift.carriers}
                                    />
                                );
                            case "alerts":
                                return (
                                    <Alerts
                                        key="alerts"
                                        alerts={shift.alerts}
                                        critical={shift.critical}
                                        onAcknowledge={feed.acknowledge}
                                    />
                                );
                            default:
                                return null;
                        }
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
