import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
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

/** What each item shows, by its id: the layout holds only ids and boxes, the content is the app's. */
export function Widget({ id }: { id: string }) {
    if (id === "traffic") return <Traffic />;
    if (id === "channels") return <Channels />;
    if (id === "pages") return <Pages />;
    return <Kpi id={id} />;
}

/** A figure, how it moved, and its last eight weeks. */
function Kpi({ id }: { id: string }) {
    const content = widget(id);
    return (
        <Card id={id} title={content.title}>
            <span className={styles.figure}>
                <span className={styles.value}>{content.value}</span>
                <span className={styles.change(content.change)}>
                    {formatChange(content.change)}
                </span>
            </span>
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={styles.sparkline}
            >
                <path d={sparkline(content.points)} />
            </svg>
        </Card>
    );
}

/** Sessions per day over a range the header's segmented control picks. */
function Traffic() {
    const [range, setRange] = useState<Range>(30);
    const { points, total, change } = sessionsOver(range);
    const line = sparkline(points, 100, 40);
    return (
        <Card
            id="traffic"
            title="Traffic"
            controls={
                <fieldset aria-label="Range" className={styles.segments}>
                    {RANGES.map((days) => (
                        <Clickable.Button
                            key={days}
                            size="sm"
                            variant={days === range ? "solid" : "outline"}
                            aria-pressed={days === range}
                            className={styles.segment(days === range)}
                            onClick={() => setRange(days)}
                        >
                            {days}d
                        </Clickable.Button>
                    ))}
                </fieldset>
            }
        >
            <span className={styles.figure}>
                <span className={styles.value}>
                    {total.toLocaleString("en-US")}
                </span>
                <span className={styles.change(change)}>
                    {formatChange(change)} on the {range} days before
                </span>
            </span>
            <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Sessions per day over the last ${range} days`}
                className={styles.chart}
            >
                <path d={`${line} L100,40 L0,40 Z`} className={styles.area} />
                <path d={line} className={styles.line} />
            </svg>
            <span className={styles.axis}>
                <span>{range} days ago</span>
                <span>Today</span>
            </span>
        </Card>
    );
}

/** This month's channels compared on a metric the header's select picks. */
function Channels() {
    const [metric, setMetric] = useState<Metric>("sessions");
    const title = METRICS.find((entry) => entry.key === metric)?.title;
    const rows = [...CHANNELS].sort((a, b) => b[metric] - a[metric]);
    const max = rows[0]?.[metric] || 1;
    return (
        <Card
            id="channels"
            title="Channels"
            controls={
                <select
                    aria-label="Metric"
                    value={metric}
                    onChange={(event) =>
                        setMetric(event.currentTarget.value as Metric)
                    }
                    className={styles.select}
                >
                    {METRICS.map((entry) => (
                        <option key={entry.key} value={entry.key}>
                            {entry.title}
                        </option>
                    ))}
                </select>
            }
        >
            <ol aria-label={`${title} by channel`} className={styles.bars}>
                {rows.map((row) => (
                    <li key={row.name} className={styles.bar}>
                        <span className={styles.barName}>{row.name}</span>
                        <span className={styles.track}>
                            <span
                                className={styles.fill}
                                // the bar's length is the data's: a width, not a look
                                style={{
                                    inlineSize: `${(row[metric] / max) * 100}%`,
                                }}
                            />
                        </span>
                        <span className={styles.barValue}>
                            {formatMetric(metric, row[metric])}
                        </span>
                    </li>
                ))}
            </ol>
        </Card>
    );
}

/** The most visited pages, and how they moved. */
function Pages() {
    return (
        <Card id="pages" title="Top pages">
            <div className={styles.scroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Page</th>
                            <th className={styles.thEnd}>Views</th>
                            <th className={styles.thEnd}>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PAGES.map((page) => (
                            <tr key={page.path} className={styles.row}>
                                <td className={styles.path}>{page.path}</td>
                                <td className={styles.number}>
                                    {page.views.toLocaleString("en-US")}
                                </td>
                                <td className={styles.cellChange(page.change)}>
                                    {formatChange(page.change)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
