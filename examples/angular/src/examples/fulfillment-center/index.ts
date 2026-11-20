import {
    afterNextRender,
    Component,
    DestroyRef,
    type ElementRef,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    type GridLayoutRef,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { LucidePause, LucidePlay, LucideWarehouse } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
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
@Component({
    selector: "example-fulfillment-center",
    imports: [
        GRID_LAYOUT,
        ClickableButton,
        LucidePause,
        LucidePlay,
        LucideWarehouse,
        Alerts,
        Backlog,
        Carriers,
        Docks,
        Kpi,
        Throughput,
    ],
    host: { class: "contents" },
    template: `
        <div #frame [class]="styles.frame">
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [breakpoints]="breakpoints"
                [cols]="cols"
                [defaultLayouts]="layouts"
                [rowHeight]="32"
                [gap]="[12, 12]"
                aria-label="Fulfillment center"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @switch (item.id) {
                        @case ("header") {
                            <div
                                gridLayoutItem="header"
                                aria-label="Shift"
                                [class]="styles.topBar"
                            >
                                <svg lucideWarehouse [class]="styles.brandIcon"></svg>
                                <span [class]="styles.brand">
                                    <span [class]="styles.heading">Fulfillment center</span>
                                    <span [class]="styles.site">DC-04 Reno · shift B</span>
                                </span>
                                <time [class]="styles.clock">{{ formatClock(shift().clock) }}</time>
                                <span [class]="styles.live(shift().playing)">
                                    {{ shift().playing ? "Live" : "Paused" }}
                                </span>
                                <button
                                    kitClickable
                                    size="sm"
                                    variant="outline"
                                    [attr.aria-label]="shift().playing ? 'Pause live data' : 'Play live data'"
                                    (click)="toggle()"
                                >
                                    @if (shift().playing) {
                                        <svg lucidePause [class]="styles.playIcon"></svg>
                                        Pause
                                    } @else {
                                        <svg lucidePlay [class]="styles.playIcon"></svg>
                                        Play
                                    }
                                </button>
                            </div>
                        }
                        @case ("orders") {
                            <fulfillment-kpi
                                itemId="orders"
                                label="Orders per minute"
                                [series]="shift().orders"
                                [format]="formatCount"
                            />
                        }
                        @case ("pick-rate") {
                            <fulfillment-kpi
                                itemId="pick-rate"
                                label="Picks per hour"
                                [series]="shift().pickRate"
                                [format]="formatCount"
                            />
                        }
                        @case ("on-time") {
                            <fulfillment-kpi
                                itemId="on-time"
                                label="On time"
                                [series]="shift().onTime"
                                [format]="formatShare"
                            />
                        }
                        @case ("throughput") {
                            <fulfillment-throughput
                                [received]="shift().orders"
                                [shipped]="shift().shipped"
                            />
                        }
                        @case ("backlog") {
                            <fulfillment-backlog [backlog]="shift().backlog" />
                        }
                        @case ("docks") {
                            <fulfillment-docks [docks]="shift().docks" />
                        }
                        @case ("carriers") {
                            <fulfillment-carriers [carriers]="shift().carriers" />
                        }
                        @case ("alerts") {
                            <fulfillment-alerts
                                [alerts]="shift().alerts"
                                [critical]="shift().critical"
                                (acknowledge)="feed.acknowledge($event)"
                            />
                        }
                    }
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class FulfillmentCenter {
    protected readonly styles = styles;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly layouts = LAYOUTS;
    protected readonly formatClock = formatClock;
    protected readonly formatCount = formatCount;
    protected readonly formatShare = formatShare;
    protected readonly gridLayoutRef = createGridLayoutRef();
    protected readonly feed = createFulfillmentFeed();
    protected readonly shift = signal(this.feed.snapshot);
    private readonly frame =
        viewChild.required<ElementRef<HTMLElement>>("frame");
    private readonly grown = new Map<string, number>();

    constructor() {
        // every new snapshot: shown, and the alerts tile follows the critical alert
        const unsubscribe = this.feed.subscribe(() => {
            const shift = this.feed.snapshot;
            this.shift.set(shift);
            fitAlerts(
                this.gridLayoutRef.current,
                shift.critical !== undefined,
                this.grown,
            );
        });
        let unwatch = () => {};
        afterNextRender(() => {
            const element = this.frame().nativeElement;
            if (!prefersReducedMotion(element.ownerDocument.defaultView)) {
                this.feed.play();
            }
            unwatch = this.feed.watch(element);
        });
        inject(DestroyRef).onDestroy(() => {
            unwatch();
            this.feed.pause();
            unsubscribe();
        });
    }

    protected toggle() {
        if (this.shift().playing) this.feed.pause();
        else this.feed.play();
    }
}
