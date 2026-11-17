// Demo content for the dashboards: what each widget shows. App data, no grid and no styles.

/** A widget's content. */
export interface Widget {
    readonly id: string;
    readonly title: string;
    /** a figure and how it moved */
    readonly value: string;
    readonly change: number;
    /** a few points for a sparkline, oldest first */
    readonly points: readonly number[];
}

export const WIDGETS: readonly Widget[] = [
    {
        id: "revenue",
        title: "Revenue",
        value: "$48.2k",
        change: 12.4,
        points: [12, 18, 15, 22, 28, 26, 34, 38],
    },
    {
        id: "orders",
        title: "Orders",
        value: "1,284",
        change: 4.1,
        points: [40, 38, 44, 47, 45, 52, 55, 58],
    },
    {
        id: "visitors",
        title: "Visitors",
        value: "23.9k",
        change: -2.3,
        points: [60, 64, 58, 55, 57, 52, 50, 49],
    },
    {
        id: "conversion",
        title: "Conversion",
        value: "3.6%",
        change: 0.4,
        points: [3, 3.2, 3.1, 3.4, 3.3, 3.5, 3.4, 3.6],
    },
    {
        id: "refunds",
        title: "Refunds",
        value: "37",
        change: -8.9,
        points: [52, 48, 50, 44, 41, 40, 38, 37],
    },
    {
        id: "latency",
        title: "Latency",
        value: "182 ms",
        change: -5.2,
        points: [220, 210, 215, 198, 190, 195, 186, 182],
    },
    {
        id: "uptime",
        title: "Uptime",
        value: "99.98%",
        change: 0.01,
        points: [99.9, 99.95, 99.97, 99.96, 99.98, 99.98, 99.97, 99.98],
    },
    {
        id: "tickets",
        title: "Open tickets",
        value: "64",
        change: 6.7,
        points: [40, 44, 48, 52, 55, 58, 61, 64],
    },
    {
        id: "signups",
        title: "Sign-ups",
        value: "412",
        change: 18.2,
        points: [20, 25, 31, 30, 38, 44, 49, 56],
    },
    {
        id: "churn",
        title: "Churn",
        value: "1.9%",
        change: -0.3,
        points: [2.6, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9],
    },
    {
        id: "nps",
        title: "NPS",
        value: "54",
        change: 3,
        points: [44, 46, 47, 49, 50, 52, 53, 54],
    },
    {
        id: "backlog",
        title: "Backlog",
        value: "128",
        change: 2.5,
        points: [110, 112, 118, 121, 119, 124, 126, 128],
    },
];

/** The widget with `id`, or a generic one for an id the demo does not know. */
export function widget(id: string): Widget {
    return (
        WIDGETS.find((entry) => entry.id === id) ?? {
            id,
            title: id,
            value: "—",
            change: 0,
            points: [1, 1],
        }
    );
}

/** A change as a signed percentage: "+12.4%", "−2.3%". */
export function formatChange(change: number): string {
    const sign = change > 0 ? "+" : change < 0 ? "−" : "";
    return `${sign}${Math.abs(change)}%`;
}

/** An SVG path for `points` in a `width` × `height` box: a sparkline. */
export function sparkline(
    points: readonly number[],
    width = 100,
    height = 32,
): string {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    return points
        .map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * width;
            const y = height - ((point - min) / range) * height;
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}
