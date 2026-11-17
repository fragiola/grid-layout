import { Component, computed, input, signal } from "@angular/core";
import { ClickableButton } from "#/components/atoms/clickable";
import {
    CHANNELS,
    formatMetric,
    METRICS,
    type Metric,
    PAGES,
    RANGES,
    type Range,
    sessionsOver,
} from "../_kit/datasets";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import { Card } from "./card";
import * as styles from "./styles";

/** A figure, how it moved, and its last eight weeks. */
@Component({
    selector: "analytics-kpi",
    imports: [Card],
    host: { class: "contents" },
    template: `
        @let content = widget(id());
        <analytics-card [itemId]="id()" [label]="content.title">
            <span [class]="styles.figure">
                <span [class]="styles.value">{{ content.value }}</span>
                <span [class]="styles.change(content.change)">
                    {{ formatChange(content.change) }}
                </span>
            </span>
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
                [class]="styles.sparkline"
            >
                <path [attr.d]="sparkline(content.points)" />
            </svg>
        </analytics-card>
    `,
})
export class Kpi {
    readonly id = input.required<string>();
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly formatChange = formatChange;
    protected readonly sparkline = sparkline;
}

/** Sessions per day over a range the header's segmented control picks. */
@Component({
    selector: "analytics-traffic",
    imports: [Card, ClickableButton],
    host: { class: "contents" },
    template: `
        <analytics-card [itemId]="'traffic'" [label]="'Traffic'">
            <fieldset cardControls aria-label="Range" [class]="styles.segments">
                @for (days of ranges; track days) {
                    <button
                        kitClickable
                        size="sm"
                        [variant]="days === range() ? 'solid' : 'outline'"
                        [attr.aria-pressed]="days === range()"
                        [class]="styles.segment(days === range())"
                        (click)="range.set(days)"
                    >
                        {{ days }}d
                    </button>
                }
            </fieldset>
            <span [class]="styles.figure">
                <span [class]="styles.value">
                    {{ traffic().total.toLocaleString("en-US") }}
                </span>
                <span [class]="styles.change(traffic().change)">
                    {{ formatChange(traffic().change) }} on the {{ range() }} days before
                </span>
            </span>
            <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                role="img"
                [attr.aria-label]="'Sessions per day over the last ' + range() + ' days'"
                [class]="styles.chart"
            >
                <path [attr.d]="line() + ' L100,40 L0,40 Z'" [class]="styles.area" />
                <path [attr.d]="line()" [class]="styles.line" />
            </svg>
            <span [class]="styles.axis">
                <span>{{ range() }} days ago</span>
                <span>Today</span>
            </span>
        </analytics-card>
    `,
})
export class Traffic {
    protected readonly styles = styles;
    protected readonly ranges = RANGES;
    protected readonly formatChange = formatChange;
    protected readonly range = signal<Range>(30);
    protected readonly traffic = computed(() => sessionsOver(this.range()));
    protected readonly line = computed(() =>
        sparkline(this.traffic().points, 100, 40),
    );
}

/** This month's channels compared on a metric the header's select picks. */
@Component({
    selector: "analytics-channels",
    imports: [Card],
    host: { class: "contents" },
    template: `
        <analytics-card [itemId]="'channels'" [label]="'Channels'">
            <select
                cardControls
                aria-label="Metric"
                [value]="metric()"
                (change)="choose($event)"
                [class]="styles.select"
            >
                @for (entry of metrics; track entry.key) {
                    <option [value]="entry.key" [selected]="entry.key === metric()">
                        {{ entry.title }}
                    </option>
                }
            </select>
            <ol [attr.aria-label]="title() + ' by channel'" [class]="styles.bars">
                @for (row of rows(); track row.name) {
                    <li [class]="styles.bar">
                        <span [class]="styles.barName">{{ row.name }}</span>
                        <span [class]="styles.track">
                            <!-- the bar's length is the data's: a width, not a look -->
                            <span
                                [class]="styles.fill"
                                [style.inline-size.%]="(row[metric()] / max()) * 100"
                            ></span>
                        </span>
                        <span [class]="styles.barValue">
                            {{ formatMetric(metric(), row[metric()]) }}
                        </span>
                    </li>
                }
            </ol>
        </analytics-card>
    `,
})
export class Channels {
    protected readonly styles = styles;
    protected readonly metrics = METRICS;
    protected readonly formatMetric = formatMetric;
    protected readonly metric = signal<Metric>("sessions");
    protected readonly title = computed(
        () => METRICS.find((entry) => entry.key === this.metric())?.title,
    );
    protected readonly rows = computed(() => {
        const metric = this.metric();
        return [...CHANNELS].sort((a, b) => b[metric] - a[metric]);
    });
    protected readonly max = computed(
        () => this.rows()[0]?.[this.metric()] || 1,
    );

    protected choose(event: Event) {
        this.metric.set((event.target as HTMLSelectElement).value as Metric);
    }
}

/** The most visited pages, and how they moved. */
@Component({
    selector: "analytics-pages",
    imports: [Card],
    host: { class: "contents" },
    template: `
        <analytics-card [itemId]="'pages'" [label]="'Top pages'">
            <div [class]="styles.scroll">
                <table [class]="styles.table">
                    <thead>
                        <tr>
                            <th [class]="styles.th">Page</th>
                            <th [class]="styles.thEnd">Views</th>
                            <th [class]="styles.thEnd">Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (page of pages; track page.path) {
                            <tr [class]="styles.row">
                                <td [class]="styles.path">{{ page.path }}</td>
                                <td [class]="styles.number">
                                    {{ page.views.toLocaleString("en-US") }}
                                </td>
                                <td [class]="styles.cellChange(page.change)">
                                    {{ formatChange(page.change) }}
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </analytics-card>
    `,
})
export class Pages {
    protected readonly styles = styles;
    protected readonly pages = PAGES;
    protected readonly formatChange = formatChange;
}

/** What each item shows, by its id: the layout holds only ids and boxes, the content is the app's. */
@Component({
    selector: "analytics-widget",
    imports: [Kpi, Traffic, Channels, Pages],
    host: { class: "contents" },
    template: `
        @switch (id()) {
            @case ("traffic") { <analytics-traffic /> }
            @case ("channels") { <analytics-channels /> }
            @case ("pages") { <analytics-pages /> }
            @default { <analytics-kpi [id]="id()" /> }
        }
    `,
})
export class Widget {
    readonly id = input.required<string>();
}
