import {
    Component,
    computed,
    type ElementRef,
    input,
    output,
    viewChild,
} from "@angular/core";
import {
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCircleX,
    LucideInfo,
    LucideOctagonAlert,
    LucideTruck,
} from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import {
    areaPath,
    CHART_INSET,
    columns,
    linePath,
    scaleOf,
    tickLabel,
    visible,
} from "../_kit/charts";
import {
    type Alert,
    type Carrier,
    DOCK_STATUS_LABELS,
    type Dock,
    formatClock,
    formatCount,
    formatDelta,
    formatShare,
    SEVERITY_LABELS,
    type Series,
    SLA_LABELS,
} from "../_kit/fulfillment";
import { sparkline } from "../_kit/widgets";
import { Card } from "./card";
import { injectSize } from "./inject-size";
import * as styles from "./styles";

/** A figure, how it moved in the last minute, and its recent past. */
@Component({
    selector: "fulfillment-kpi",
    imports: [Card],
    host: { class: "contents" },
    template: `
        <fulfillment-card [itemId]="itemId()" [label]="label()">
            <span [class]="styles.figure">
                <span [class]="styles.value">{{ format()(series().value) }}</span>
                <span [class]="styles.delta(series().change)">
                    {{ formatDelta(series().change) }} in 1 min
                </span>
            </span>
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
                [class]="styles.sparkline"
            >
                <path [attr.d]="line()" />
            </svg>
        </fulfillment-card>
    `,
})
export class Kpi {
    readonly itemId = input.required<string>();
    readonly label = input.required<string>();
    readonly series = input.required<Series>();
    readonly format = input.required<(value: number) => string>();
    protected readonly styles = styles;
    protected readonly formatDelta = formatDelta;
    protected readonly line = computed(() =>
        sparkline(this.series().history.slice(-24)),
    );
}

/**
 * Orders received and shipped per minute: a line chart drawn at its box's size, as many recent
 * points as fit (one every 8 pixels), its guides as many as its height takes.
 */
@Component({
    selector: "fulfillment-throughput",
    imports: [Card],
    host: { class: "contents" },
    template: `
        <fulfillment-card
            itemId="throughput"
            label="Throughput"
            [aside]="received().value + ' in · ' + shipped().value + ' out / min'"
        >
            <div #box [class]="styles.chartBox">
                @if (size().width > 0) {
                    <svg
                        [attr.viewBox]="'0 0 ' + size().width + ' ' + size().height"
                        [attr.width]="size().width"
                        [attr.height]="size().height"
                        role="img"
                        aria-label="Orders received and shipped per minute"
                        [class]="styles.chart"
                    >
                        @for (tick of chart().scale.ticks; track tick.value) {
                            <svg:g>
                                <svg:line
                                    [attr.x1]="inset.start"
                                    [attr.x2]="size().width"
                                    [attr.y1]="tick.y"
                                    [attr.y2]="tick.y"
                                    [class]="styles.guide"
                                />
                                <svg:text
                                    [attr.x]="inset.start - 6"
                                    [attr.y]="tick.y"
                                    [class]="styles.guideLabel"
                                >{{ tickLabel(tick.value) }}</svg:text>
                            </svg:g>
                        }
                        <path [attr.d]="chart().area" [class]="styles.area" />
                        <path [attr.d]="chart().line" [class]="styles.line" />
                        <path [attr.d]="chart().second" [class]="styles.secondLine" />
                    </svg>
                }
            </div>
            <span [class]="styles.legend">
                <span [class]="styles.legendItem">
                    <span [class]="styles.legendLine"></span>
                    Received
                </span>
                <span [class]="styles.legendItem">
                    <span [class]="styles.legendDashed"></span>
                    Shipped
                </span>
            </span>
        </fulfillment-card>
    `,
})
export class Throughput {
    readonly received = input.required<Series>();
    readonly shipped = input.required<Series>();
    protected readonly styles = styles;
    protected readonly inset = CHART_INSET;
    protected readonly tickLabel = tickLabel;
    private readonly box = viewChild<ElementRef<HTMLElement>>("box");
    protected readonly size = injectSize(this.box);
    protected readonly chart = computed(() => {
        const size = this.size();
        const ins = visible(this.received().history, size.width, 8);
        const outs = visible(this.shipped().history, size.width, 8);
        const scale = scaleOf(Math.max(...ins, ...outs), size.height);
        const line = linePath(ins, size, scale);
        return {
            scale,
            line,
            area: areaPath(line, size, scale),
            second: linePath(outs, size, scale),
        };
    });
}

/** Orders waiting, one column per reading: as many as fit its box, one every 14 pixels. */
@Component({
    selector: "fulfillment-backlog",
    imports: [Card],
    host: { class: "contents" },
    template: `
        <fulfillment-card
            itemId="backlog"
            label="Backlog"
            [aside]="formatCount(backlog().value) + ' orders'"
        >
            <div #box [class]="styles.chartBox">
                @if (size().width > 0) {
                    <svg
                        [attr.viewBox]="'0 0 ' + size().width + ' ' + size().height"
                        [attr.width]="size().width"
                        [attr.height]="size().height"
                        role="img"
                        aria-label="Orders waiting to be picked or packed"
                        [class]="styles.chart"
                    >
                        @for (tick of chart().scale.ticks; track tick.value) {
                            <svg:g>
                                <svg:line
                                    [attr.x1]="inset.start"
                                    [attr.x2]="size().width"
                                    [attr.y1]="tick.y"
                                    [attr.y2]="tick.y"
                                    [class]="styles.guide"
                                />
                                <svg:text
                                    [attr.x]="inset.start - 6"
                                    [attr.y]="tick.y"
                                    [class]="styles.guideLabel"
                                >{{ tickLabel(tick.value) }}</svg:text>
                            </svg:g>
                        }
                        <!-- a column is a place in the chart, not a reading: tracked by its index -->
                        @for (bar of chart().bars; track $index; let last = $last) {
                            <svg:rect
                                [attr.x]="bar.x"
                                [attr.y]="bar.y"
                                [attr.width]="bar.width"
                                [attr.height]="bar.height"
                                rx="1"
                                [class]="last ? styles.lastColumn : styles.column"
                            />
                        }
                    </svg>
                }
            </div>
        </fulfillment-card>
    `,
})
export class Backlog {
    readonly backlog = input.required<Series>();
    protected readonly styles = styles;
    protected readonly inset = CHART_INSET;
    protected readonly tickLabel = tickLabel;
    protected readonly formatCount = formatCount;
    private readonly box = viewChild<ElementRef<HTMLElement>>("box");
    protected readonly size = injectSize(this.box);
    protected readonly chart = computed(() => {
        const size = this.size();
        const points = visible(this.backlog().history, size.width, 14);
        const scale = scaleOf(Math.max(...points), size.height);
        return { scale, bars: columns(points, size, scale) };
    });
}

/** The dock doors, each with its truck's carrier and load: as many to a row as the tile fits. */
@Component({
    selector: "fulfillment-docks",
    imports: [Card, LucideTruck],
    host: { class: "contents" },
    template: `
        <fulfillment-card itemId="docks" label="Dock doors" [aside]="loading() + ' loading'">
            <ul aria-label="Doors" [class]="styles.doors">
                @for (dock of docks(); track dock.id) {
                    <li
                        [attr.aria-label]="dock.name"
                        [attr.data-status]="dock.status"
                        [class]="styles.door(dock.status)"
                    >
                        <span [class]="styles.doorTop">
                            <span [class]="styles.doorName">{{ dock.name }}</span>
                            <span [class]="styles.doorStatus">
                                @if (dock.status !== "empty") {
                                    <svg lucideTruck [class]="styles.truck"></svg>
                                }
                                {{ labels[dock.status] }}
                            </span>
                        </span>
                        <span [class]="styles.doorBottom">
                            <span [class]="styles.carrierName">{{ dock.carrier ?? "No truck" }}</span>
                            @if (dock.carrier) {
                                <span [class]="styles.load">{{ percent(dock.progress) }}%</span>
                            }
                        </span>
                        <span aria-hidden="true" [class]="styles.track">
                            <!-- the truck's load is the data's: a width, not a look -->
                            <span
                                [class]="styles.fill"
                                [style.inline-size.%]="dock.progress * 100"
                            ></span>
                        </span>
                    </li>
                }
            </ul>
        </fulfillment-card>
    `,
})
export class Docks {
    readonly docks = input.required<readonly Dock[]>();
    protected readonly styles = styles;
    protected readonly labels = DOCK_STATUS_LABELS;
    protected readonly percent = (progress: number) =>
        Math.round(progress * 100);
    protected readonly loading = computed(
        () => this.docks().filter((dock) => dock.status === "loading").length,
    );
}

/** Each carrier of the shift against its SLA, its status in a word and an icon. */
@Component({
    selector: "fulfillment-carriers",
    imports: [Card, LucideCircleCheck, LucideCircleAlert, LucideCircleX],
    host: { class: "contents" },
    template: `
        <fulfillment-card itemId="carriers" label="Carrier SLA">
            <div [class]="styles.scroll">
                <table [class]="styles.table">
                    <thead>
                        <tr>
                            <th [class]="styles.th">Carrier</th>
                            <th [class]="styles.thEnd">Cut-off</th>
                            <th [class]="styles.thEnd">Shipped</th>
                            <th [class]="styles.thEnd">On time</th>
                            <th [class]="styles.thEnd">SLA</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (carrier of carriers(); track carrier.id) {
                            <tr [class]="styles.row">
                                <td [class]="styles.cell">{{ carrier.name }}</td>
                                <td [class]="styles.number">{{ carrier.cutoff }}</td>
                                <td [class]="styles.number">{{ formatCount(carrier.shipped) }}</td>
                                <td [class]="styles.number">{{ formatShare(carrier.onTime) }}</td>
                                <td [class]="styles.number">
                                    <!-- with its word, a status never relies on colour alone -->
                                    <span [class]="styles.badge(carrier.status)">
                                        @switch (carrier.status) {
                                            @case ("on-track") { <svg lucideCircleCheck [class]="styles.badgeIcon"></svg> }
                                            @case ("at-risk") { <svg lucideCircleAlert [class]="styles.badgeIcon"></svg> }
                                            @case ("breach") { <svg lucideCircleX [class]="styles.badgeIcon"></svg> }
                                        }
                                        {{ labels[carrier.status] }}
                                    </span>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </fulfillment-card>
    `,
})
export class Carriers {
    readonly carriers = input.required<readonly Carrier[]>();
    protected readonly styles = styles;
    protected readonly labels = SLA_LABELS;
    protected readonly formatCount = formatCount;
    protected readonly formatShare = formatShare;
}

/**
 * The alerts feed, newest first. A critical alert nobody acknowledged sits above it, with the
 * button that acknowledges it; the app grows the tile while it waits (see index.ts).
 */
@Component({
    selector: "fulfillment-alerts",
    imports: [
        Card,
        ClickableButton,
        LucideInfo,
        LucideCircleAlert,
        LucideOctagonAlert,
    ],
    host: { class: "contents" },
    template: `
        <fulfillment-card
            itemId="alerts"
            label="Alerts"
            [aside]="open() + ' open'"
            [critical]="critical() !== undefined"
        >
            @if (critical(); as waiting) {
                <span [class]="styles.criticalStripe"></span>
                <div role="alert" [class]="styles.critical">
                    <span [class]="styles.criticalTitle">
                        <svg lucideOctagonAlert [class]="styles.criticalIcon"></svg>
                        Critical · {{ formatClock(waiting.at) }}
                    </span>
                    <span [class]="styles.criticalMessage">{{ waiting.message }}</span>
                    <button
                        kitClickable
                        size="sm"
                        variant="solid"
                        [class]="styles.acknowledge"
                        (click)="acknowledge.emit(waiting.id)"
                    >
                        Acknowledge
                    </button>
                </div>
            }
            <ol aria-label="Alert feed" [class]="styles.alerts">
                @for (alert of alerts(); track alert.id) {
                    <li
                        [attr.data-severity]="alert.severity"
                        [class]="styles.alert(alert.acknowledged)"
                    >
                        <!-- with its word, a severity never relies on colour alone -->
                        <span [class]="styles.badge(alert.severity)">
                            @switch (alert.severity) {
                                @case ("info") { <svg lucideInfo [class]="styles.badgeIcon"></svg> }
                                @case ("warning") { <svg lucideCircleAlert [class]="styles.badgeIcon"></svg> }
                                @case ("critical") { <svg lucideOctagonAlert [class]="styles.badgeIcon"></svg> }
                            }
                            {{ labels[alert.severity] }}
                        </span>
                        <span [class]="styles.alertMessage">{{ alert.message }}</span>
                        <span [class]="styles.alertTime">{{ formatClock(alert.at) }}</span>
                    </li>
                }
            </ol>
        </fulfillment-card>
    `,
})
export class Alerts {
    readonly alerts = input.required<readonly Alert[]>();
    readonly critical = input<Alert>();
    readonly acknowledge = output<number>();
    protected readonly styles = styles;
    protected readonly labels = SEVERITY_LABELS;
    protected readonly formatClock = formatClock;
    protected readonly open = computed(
        () => this.alerts().filter((alert) => !alert.acknowledged).length,
    );
}
