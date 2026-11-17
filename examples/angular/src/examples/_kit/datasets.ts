// Demo data for the apps: a store's traffic, channels and pages, and the services an operations
// team watches. Deterministic (seeded), no network. App data, no grid and no styles.

import { seeded } from "./layouts";

/** The ranges the traffic chart offers, in days. */
export const RANGES = [7, 30, 90] as const;

/** A range the traffic chart can show. */
export type Range = (typeof RANGES)[number];

/** Sessions per day over the last 180 days, oldest first: a slow rise, quiet weekends, noise. */
export const SESSIONS: readonly number[] = (() => {
    const random = seeded(42);
    return Array.from({ length: 180 }, (_, day) => {
        const trend = 900 + day * 3.2;
        const weekend = day % 7 === 5 || day % 7 === 6 ? 0.78 : 1;
        return Math.round(trend * weekend * (0.9 + random() * 0.2));
    });
})();

/** The last `days` days of sessions, and the same number of days before them. */
export function sessionsOver(days: number): {
    readonly points: readonly number[];
    readonly total: number;
    /** against the period before, as a percentage */
    readonly change: number;
} {
    const points = SESSIONS.slice(-days);
    const before = SESSIONS.slice(-2 * days, -days);
    const total = sum(points);
    const previous = sum(before) || 1;
    return {
        points,
        total,
        change: Math.round(((total - previous) / previous) * 1000) / 10,
    };
}

function sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** What the channels chart can compare. */
export const METRICS = [
    { key: "sessions", title: "Sessions" },
    { key: "orders", title: "Orders" },
    { key: "revenue", title: "Revenue" },
] as const;

/** A metric the channels chart compares. */
export type Metric = (typeof METRICS)[number]["key"];

/** Where the sessions came from, this month. */
export const CHANNELS: readonly ({ readonly name: string } & Readonly<
    Record<Metric, number>
>)[] = [
    { name: "Search", sessions: 18_420, orders: 512, revenue: 21_340 },
    { name: "Direct", sessions: 9_870, orders: 388, revenue: 16_920 },
    { name: "Social", sessions: 7_310, orders: 141, revenue: 4_870 },
    { name: "Email", sessions: 4_260, orders: 236, revenue: 9_610 },
    { name: "Referral", sessions: 2_950, orders: 87, revenue: 3_120 },
];

/** A metric's value, for people: "18,420", "$21.3k". */
export function formatMetric(metric: Metric, value: number): string {
    if (metric === "revenue") return `$${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString("en-US");
}

/** The most visited pages, this month. */
export const PAGES = [
    { path: "/", views: 24_180, change: 3.4 },
    { path: "/pricing", views: 11_204, change: 12.8 },
    { path: "/products/lamp", views: 8_932, change: -4.1 },
    { path: "/blog/winter-sale", views: 6_517, change: 41.2 },
    { path: "/checkout", views: 4_388, change: 1.9 },
] as const;

/** A service's state, as the monitor shows it: never by colour alone. */
export type ServiceStatus = "ok" | "warn" | "down";

/** What each status is called. */
export const STATUS_LABELS: Record<ServiceStatus, string> = {
    ok: "Operational",
    warn: "Degraded",
    down: "Down",
};

/** A service the operations team watches. */
export interface Service {
    readonly id: string;
    readonly name: string;
    readonly status: ServiceStatus;
    /** the 95th percentile of its response time */
    readonly p95: number;
    /** its share of failed requests, as a percentage */
    readonly errors: number;
}

const NAMES = [
    "Gateway",
    "Auth",
    "Accounts",
    "Payments",
    "Checkout",
    "Cart",
    "Catalog",
    "Search",
    "Pricing",
    "Inventory",
    "Orders",
    "Shipping",
    "Invoices",
    "Emails",
    "Push",
    "Webhooks",
    "Media",
    "CDN",
    "Reports",
    "Billing",
    "Reviews",
    "Recommender",
    "Scheduler",
    "Audit log",
];

/** Which services are not well: the rest are operational. */
const TROUBLE: Readonly<Record<string, ServiceStatus>> = {
    Payments: "down",
    Search: "warn",
    Shipping: "warn",
    Webhooks: "down",
    Reports: "warn",
};

/** Two dozen services, a few of them degraded or down. */
export const SERVICES: readonly Service[] = (() => {
    const random = seeded(11);
    return NAMES.map((name) => {
        const status = TROUBLE[name] ?? "ok";
        const slow = status === "ok" ? 1 : status === "warn" ? 4 : 9;
        return {
            id: name.toLowerCase().replace(/\s+/g, "-"),
            name,
            status,
            p95: Math.round((40 + random() * 120) * slow),
            errors:
                Math.round(
                    (status === "down" ? 30 + random() * 40 : random()) * slow,
                ) / 10,
        };
    });
})();

/** How many services are in each status. */
export function countByStatus(
    services: readonly Service[],
): Record<ServiceStatus, number> {
    const counts: Record<ServiceStatus, number> = { ok: 0, warn: 0, down: 0 };
    for (const service of services) counts[service.status] += 1;
    return counts;
}
