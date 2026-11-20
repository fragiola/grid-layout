import {
    CircleAlert,
    CircleCheck,
    CircleX,
    Info,
    OctagonAlert,
    Truck,
} from "lucide-react";
import { Clickable } from "#/components/atoms/clickable";
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
import * as styles from "./styles";
import { useSize } from "./use-size";

/** Each SLA status's and severity's icon: with its word, a status never relies on colour alone. */
const SLA_ICONS = {
    "on-track": CircleCheck,
    "at-risk": CircleAlert,
    breach: CircleX,
} as const;

const SEVERITY_ICONS = {
    info: Info,
    warning: CircleAlert,
    critical: OctagonAlert,
} as const;

/** A figure, how it moved in the last minute, and its recent past. */
export function Kpi({
    id,
    title,
    series,
    format,
}: {
    id: string;
    title: string;
    series: Series;
    format: (value: number) => string;
}) {
    return (
        <Card id={id} title={title}>
            <span className={styles.figure}>
                <span className={styles.value}>{format(series.value)}</span>
                <span className={styles.delta(series.change)}>
                    {formatDelta(series.change)} in 1 min
                </span>
            </span>
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={styles.sparkline}
            >
                <path d={sparkline(series.history.slice(-24))} />
            </svg>
        </Card>
    );
}

/**
 * Orders received and shipped per minute: a line chart drawn at its box's size, as many recent
 * points as fit (one every 8 pixels), its guides as many as its height takes.
 */
export function Throughput({
    received,
    shipped,
}: {
    received: Series;
    shipped: Series;
}) {
    const [box, size] = useSize<HTMLDivElement>();
    const ins = visible(received.history, size.width, 8);
    const outs = visible(shipped.history, size.width, 8);
    const scale = scaleOf(Math.max(...ins, ...outs), size.height);
    const line = linePath(ins, size, scale);
    return (
        <Card
            id="throughput"
            title="Throughput"
            aside={`${received.value} in · ${shipped.value} out / min`}
        >
            <div ref={box} className={styles.chartBox}>
                {size.width > 0 ? (
                    <svg
                        viewBox={`0 0 ${size.width} ${size.height}`}
                        width={size.width}
                        height={size.height}
                        role="img"
                        aria-label="Orders received and shipped per minute"
                        className={styles.chart}
                    >
                        <Guides ticks={scale.ticks} width={size.width} />
                        <path
                            d={areaPath(line, size, scale)}
                            className={styles.area}
                        />
                        <path d={line} className={styles.line} />
                        <path
                            d={linePath(outs, size, scale)}
                            className={styles.secondLine}
                        />
                    </svg>
                ) : null}
            </div>
            <span className={styles.legend}>
                <span className={styles.legendItem}>
                    <span className={styles.legendLine} />
                    Received
                </span>
                <span className={styles.legendItem}>
                    <span className={styles.legendDashed} />
                    Shipped
                </span>
            </span>
        </Card>
    );
}

/** Orders waiting, one column per reading: as many as fit its box, one every 14 pixels. */
export function Backlog({ backlog }: { backlog: Series }) {
    const [box, size] = useSize<HTMLDivElement>();
    const points = visible(backlog.history, size.width, 14);
    const scale = scaleOf(Math.max(...points), size.height);
    const bars = columns(points, size, scale);
    return (
        <Card
            id="backlog"
            title="Backlog"
            aside={`${formatCount(backlog.value)} orders`}
        >
            <div ref={box} className={styles.chartBox}>
                {size.width > 0 ? (
                    <svg
                        viewBox={`0 0 ${size.width} ${size.height}`}
                        width={size.width}
                        height={size.height}
                        role="img"
                        aria-label="Orders waiting to be picked or packed"
                        className={styles.chart}
                    >
                        <Guides ticks={scale.ticks} width={size.width} />
                        {bars.map((bar, index) => (
                            <rect
                                // a column is a place in the chart, not a reading
                                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                                key={index}
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                height={bar.height}
                                rx={1}
                                className={
                                    index === bars.length - 1
                                        ? styles.lastColumn
                                        : styles.column
                                }
                            />
                        ))}
                    </svg>
                ) : null}
            </div>
        </Card>
    );
}

/** A chart's horizontal guides, each labelled with its value. */
function Guides({
    ticks,
    width,
}: {
    ticks: readonly { y: number; value: number }[];
    width: number;
}) {
    return ticks.map((tick) => (
        <g key={tick.value}>
            <line
                x1={CHART_INSET.start}
                x2={width}
                y1={tick.y}
                y2={tick.y}
                className={styles.guide}
            />
            <text
                x={CHART_INSET.start - 6}
                y={tick.y}
                className={styles.guideLabel}
            >
                {tickLabel(tick.value)}
            </text>
        </g>
    ));
}

/** The dock doors, each with its truck's carrier and load: as many to a row as the tile fits. */
export function Docks({ docks }: { docks: readonly Dock[] }) {
    const loading = docks.filter((dock) => dock.status === "loading").length;
    return (
        <Card id="docks" title="Dock doors" aside={`${loading} loading`}>
            <ul aria-label="Doors" className={styles.doors}>
                {docks.map((dock) => (
                    <li
                        key={dock.id}
                        aria-label={dock.name}
                        data-status={dock.status}
                        className={styles.door(dock.status)}
                    >
                        <span className={styles.doorTop}>
                            <span className={styles.doorName}>{dock.name}</span>
                            <span className={styles.doorStatus}>
                                {dock.status === "empty" ? null : (
                                    <Truck
                                        aria-hidden="true"
                                        className={styles.truck}
                                    />
                                )}
                                {DOCK_STATUS_LABELS[dock.status]}
                            </span>
                        </span>
                        <span className={styles.doorBottom}>
                            <span className={styles.carrierName}>
                                {dock.carrier ?? "No truck"}
                            </span>
                            {dock.carrier ? (
                                <span className={styles.load}>
                                    {Math.round(dock.progress * 100)}%
                                </span>
                            ) : null}
                        </span>
                        <span aria-hidden="true" className={styles.track}>
                            <span
                                className={styles.fill}
                                // the truck's load is the data's: a width, not a look
                                style={{
                                    inlineSize: `${dock.progress * 100}%`,
                                }}
                            />
                        </span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

/** Each carrier of the shift against its SLA, its status in a word and an icon. */
export function Carriers({ carriers }: { carriers: readonly Carrier[] }) {
    return (
        <Card id="carriers" title="Carrier SLA">
            <div className={styles.scroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Carrier</th>
                            <th className={styles.thEnd}>Cut-off</th>
                            <th className={styles.thEnd}>Shipped</th>
                            <th className={styles.thEnd}>On time</th>
                            <th className={styles.thEnd}>SLA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carriers.map((carrier) => {
                            const Icon = SLA_ICONS[carrier.status];
                            return (
                                <tr key={carrier.id} className={styles.row}>
                                    <td className={styles.cell}>
                                        {carrier.name}
                                    </td>
                                    <td className={styles.number}>
                                        {carrier.cutoff}
                                    </td>
                                    <td className={styles.number}>
                                        {formatCount(carrier.shipped)}
                                    </td>
                                    <td className={styles.number}>
                                        {formatShare(carrier.onTime)}
                                    </td>
                                    <td className={styles.number}>
                                        <span
                                            className={styles.badge(
                                                carrier.status,
                                            )}
                                        >
                                            <Icon
                                                aria-hidden="true"
                                                className={styles.badgeIcon}
                                            />
                                            {SLA_LABELS[carrier.status]}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/**
 * The alerts feed, newest first. A critical alert nobody acknowledged sits above it, with the
 * button that acknowledges it; the app grows the tile while it waits (see index.tsx).
 */
export function Alerts({
    alerts,
    critical,
    onAcknowledge,
}: {
    alerts: readonly Alert[];
    critical: Alert | undefined;
    onAcknowledge: (alertId: number) => void;
}) {
    const open = alerts.filter((alert) => !alert.acknowledged).length;
    return (
        <Card
            id="alerts"
            title="Alerts"
            aside={`${open} open`}
            data-critical={critical ? "" : undefined}
        >
            {critical ? (
                <>
                    <span className={styles.criticalStripe} />
                    <div role="alert" className={styles.critical}>
                        <span className={styles.criticalTitle}>
                            <OctagonAlert
                                aria-hidden="true"
                                className={styles.criticalIcon}
                            />
                            Critical · {formatClock(critical.at)}
                        </span>
                        <span className={styles.criticalMessage}>
                            {critical.message}
                        </span>
                        <Clickable.Button
                            size="sm"
                            variant="solid"
                            className={styles.acknowledge}
                            onClick={() => onAcknowledge(critical.id)}
                        >
                            Acknowledge
                        </Clickable.Button>
                    </div>
                </>
            ) : null}
            <ol aria-label="Alert feed" className={styles.alerts}>
                {alerts.map((alert) => {
                    const Icon = SEVERITY_ICONS[alert.severity];
                    return (
                        <li
                            key={alert.id}
                            data-severity={alert.severity}
                            className={styles.alert(alert.acknowledged)}
                        >
                            <span className={styles.badge(alert.severity)}>
                                <Icon
                                    aria-hidden="true"
                                    className={styles.badgeIcon}
                                />
                                {SEVERITY_LABELS[alert.severity]}
                            </span>
                            <span className={styles.alertMessage}>
                                {alert.message}
                            </span>
                            <span className={styles.alertTime}>
                                {formatClock(alert.at)}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </Card>
    );
}
