// Demo data for the fulfillment center: a seeded simulation of one shift (orders coming in and
// shipping out, the backlog between them, trucks loading at the dock doors, carriers against
// their SLA, alerts), and a feed that advances it a few times a second while it plays. The same
// seed gives the same shift. App content and app policy, not part of the grid layout: the app
// reads a snapshot and renders it; no framework, no DOM beyond the timer and the visibility watch.

/** A seeded random source in [0, 1) (mulberry32): the same seed, the same numbers. */
export function randomSource(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let x = state;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

/** How many points a series keeps: the charts show as many of the last ones as fit. */
export const HISTORY = 96;

/** How much simulated time one tick is, in seconds. */
const TICK_SECONDS = 5;

/** A figure over time: its latest value is the last point. */
export interface Series {
    /** the latest value */
    readonly value: number;
    /** how it moved against the point a minute before, as a fraction (0.05 is 5%) */
    readonly change: number;
    /** the last values, oldest first */
    readonly history: readonly number[];
}

/** A dock door's state. */
export type DockStatus = "empty" | "waiting" | "loading" | "departing";

export const DOCK_STATUS_LABELS: Record<DockStatus, string> = {
    empty: "Free",
    waiting: "Waiting",
    loading: "Loading",
    departing: "Departing",
};

/** One dock door, and the truck at it if there is one. */
export interface Dock {
    readonly id: string;
    /** the door's name, as painted on it */
    readonly name: string;
    readonly status: DockStatus;
    /** the truck's carrier, while a truck is at the door */
    readonly carrier: string | undefined;
    /** how full the truck is, from 0 to 1 */
    readonly progress: number;
}

/** A carrier's standing against its service-level agreement. */
export type SlaStatus = "on-track" | "at-risk" | "breach";

export const SLA_LABELS: Record<SlaStatus, string> = {
    "on-track": "On track",
    "at-risk": "At risk",
    breach: "Breach",
};

/** One carrier of the shift. */
export interface Carrier {
    readonly id: string;
    readonly name: string;
    /** the cut-off its trucks leave by, as "HH:MM" */
    readonly cutoff: string;
    /** parcels handed over this shift */
    readonly shipped: number;
    /** the share of them that left on time, from 0 to 1 */
    readonly onTime: number;
    readonly status: SlaStatus;
}

/** How bad an alert is. */
export type Severity = "info" | "warning" | "critical";

export const SEVERITY_LABELS: Record<Severity, string> = {
    info: "Info",
    warning: "Warning",
    critical: "Critical",
};

/** One entry of the alerts feed. */
export interface Alert {
    readonly id: number;
    readonly severity: Severity;
    readonly message: string;
    /** when it was raised, in simulated seconds since midnight */
    readonly at: number;
    readonly acknowledged: boolean;
}

/** Everything the dashboard shows at one moment: replaced whole on every change. */
export interface Snapshot {
    /** how many ticks have run */
    readonly tick: number;
    /** simulated seconds since midnight */
    readonly clock: number;
    /** whether the feed is playing (the app's Pause/Play) */
    readonly playing: boolean;
    /** orders received per minute */
    readonly orders: Series;
    /** units picked per hour */
    readonly pickRate: Series;
    /** the share of orders shipped before their promise, from 0 to 1 */
    readonly onTime: Series;
    /** orders shipped per minute: the other line of the throughput chart */
    readonly shipped: Series;
    /** orders waiting to be picked or packed */
    readonly backlog: Series;
    readonly docks: readonly Dock[];
    readonly carriers: readonly Carrier[];
    /** the newest first, at most {@link MAX_ALERTS} */
    readonly alerts: readonly Alert[];
    /** the oldest critical alert nobody acknowledged yet */
    readonly critical: Alert | undefined;
}

/** How many alerts the feed keeps. */
export const MAX_ALERTS = 24;

/** The tick the shift's first critical alert comes at: a few seconds after it starts playing. */
export const FIRST_CRITICAL_TICK = 6;

const CARRIERS = [
    { id: "northline", name: "Northline Freight", cutoff: "15:30" },
    { id: "bluepeak", name: "Bluepeak Parcel", cutoff: "16:00" },
    { id: "coastal", name: "Coastal Express", cutoff: "16:45" },
    { id: "ridge", name: "Ridge Logistics", cutoff: "17:15" },
    { id: "swift", name: "Swift Arrow", cutoff: "18:00" },
    { id: "meridian", name: "Meridian Cargo", cutoff: "19:30" },
] as const;

const ZONES = ["A", "B", "C", "D", "E"];

const CRITICALS = [
    "Conveyor 2 jammed at the sorter: packing is halted",
    "Fire door alarm in zone D: pickers evacuated",
    "Label printers offline at packing: no parcel can ship",
    "Sorter power fault: lanes 4 to 9 stopped",
];

const DOOR_COUNT = 8;

function pick<T>(items: readonly T[], random: () => number): T {
    return items[Math.floor(random() * items.length)] as T;
}

function clamp(value: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, value));
}

/** A walk pulled back towards `mean`, so a long run stays readable. */
function walk(
    value: number,
    mean: number,
    spread: number,
    random: () => number,
): number {
    return value + (random() - 0.5) * 2 * spread + (mean - value) * 0.08;
}

/** A series with `value` as its new last point. */
function pushed(series: Series, value: number): Series {
    const history = [...series.history.slice(1), value];
    // a minute ago: twelve ticks of five seconds
    const before = history[history.length - 1 - 60 / TICK_SECONDS] ?? value;
    return {
        value,
        change: before === 0 ? 0 : value / before - 1,
        history,
    };
}

/** A series whose past was walked from `start` around `mean`. */
function seeded(
    start: number,
    mean: number,
    spread: number,
    random: () => number,
    round: (value: number) => number,
): Series {
    let value = start;
    const history: number[] = [];
    for (let point = 0; point < HISTORY; point++) {
        value = round(walk(value, mean, spread, random));
        history.push(value);
    }
    const series: Series = { value, change: 0, history };
    return pushed(series, round(walk(value, mean, spread, random)));
}

const whole = (value: number) => Math.max(0, Math.round(value));
const ratio = (value: number) => clamp(Math.round(value * 1000) / 1000, 0, 1);

function slaOf(onTime: number): SlaStatus {
    if (onTime >= 0.95) return "on-track";
    if (onTime >= 0.9) return "at-risk";
    return "breach";
}

/** The shift as it stands when the dashboard opens: the same for the same seed. */
export function initialSnapshot(seed = 1): Snapshot {
    const random = randomSource(seed);
    const orders = seeded(140, 140, 9, random, whole);
    const shipped = seeded(136, 138, 9, random, whole);
    const docks: Dock[] = Array.from({ length: DOOR_COUNT }, (_, index) => {
        const roll = random();
        const status: DockStatus =
            roll < 0.55 ? "loading" : roll < 0.75 ? "waiting" : "empty";
        return {
            id: `door-${index + 1}`,
            name: `Door ${index + 1}`,
            status,
            carrier:
                status === "empty" ? undefined : pick(CARRIERS, random).name,
            progress:
                status === "loading" ? Math.round(random() * 80) / 100 : 0,
        };
    });
    const carriers: Carrier[] = CARRIERS.map((carrier) => {
        const onTime = ratio(0.88 + random() * 0.11);
        return {
            ...carrier,
            shipped: 300 + Math.floor(random() * 900),
            onTime,
            status: slaOf(onTime),
        };
    });
    return {
        tick: 0,
        // 14:00:00
        clock: 14 * 3600,
        playing: false,
        orders,
        pickRate: seeded(2400, 2400, 60, random, whole),
        onTime: seeded(0.962, 0.962, 0.004, random, ratio),
        shipped,
        backlog: seeded(320, 320, 14, random, whole),
        docks,
        carriers,
        alerts: [
            {
                id: 1,
                severity: "info",
                message: "Shift B started: 64 pickers, 18 packers",
                at: 14 * 3600 - 15 * 60,
                acknowledged: false,
            },
        ],
        critical: undefined,
    };
}

/** The next free id of an alerts list. */
function nextId(alerts: readonly Alert[]): number {
    return (alerts[0]?.id ?? 0) + 1;
}

function oldestCritical(alerts: readonly Alert[]): Alert | undefined {
    // the newest are first: the oldest waiting is the last one found
    let oldest: Alert | undefined;
    for (const alert of alerts) {
        if (alert.severity === "critical" && !alert.acknowledged)
            oldest = alert;
    }
    return oldest;
}

/** A door one tick later: a truck arrives, docks, loads and leaves, which `depart` tells. */
function nextDock(
    dock: Dock,
    random: () => number,
    slowed: number,
    depart: (message: string) => void,
): Dock {
    if (dock.status === "empty") {
        return random() < 0.08
            ? {
                  ...dock,
                  status: "waiting",
                  carrier: pick(CARRIERS, random).name,
              }
            : dock;
    }
    if (dock.status === "waiting") {
        return random() < 0.2
            ? { ...dock, status: "loading", progress: 0.02 }
            : dock;
    }
    if (dock.status === "loading") {
        const progress = Math.min(
            1,
            Math.round((dock.progress + random() * 0.05 * slowed) * 100) / 100,
        );
        return progress >= 1
            ? { ...dock, status: "departing", progress: 1 }
            : { ...dock, progress };
    }
    // departing: the truck leaves full, the door is free
    depart(`${dock.name}: ${dock.carrier ?? "a truck"} departed full`);
    return { ...dock, status: "empty", carrier: undefined, progress: 0 };
}

/** The shift one tick later: a new snapshot, the old one untouched. */
export function advance(snapshot: Snapshot, random: () => number): Snapshot {
    const tick = snapshot.tick + 1;
    const clock = snapshot.clock + TICK_SECONDS;
    // an unacknowledged critical slows shipping: the jam is real until someone looks at it
    const slowed = snapshot.critical ? 0.7 : 1;
    const orders = pushed(
        snapshot.orders,
        whole(walk(snapshot.orders.value, 140, 9, random)),
    );
    const shipped = pushed(
        snapshot.shipped,
        whole(walk(snapshot.shipped.value, 138 * slowed, 9, random)),
    );
    const backlog = pushed(
        snapshot.backlog,
        // what came in and did not leave piles up, slowly drained back to its usual level
        whole(
            snapshot.backlog.value +
                (orders.value - shipped.value) / 6 +
                (320 - snapshot.backlog.value) * 0.03,
        ),
    );
    const pickRate = pushed(
        snapshot.pickRate,
        whole(walk(snapshot.pickRate.value, 2400 * slowed, 60, random)),
    );
    const onTime = pushed(
        snapshot.onTime,
        ratio(
            walk(
                snapshot.onTime.value,
                0.962 - (1 - slowed) / 10,
                0.004,
                random,
            ),
        ),
    );

    const raised: Omit<Alert, "id">[] = [];
    const docks = snapshot.docks.map((dock) =>
        nextDock(dock, random, slowed, (message) =>
            raised.push({
                severity: "info",
                message,
                at: clock,
                acknowledged: false,
            }),
        ),
    );

    const carriers = snapshot.carriers.map((carrier): Carrier => {
        if (random() > 0.3) return carrier;
        const onTime = ratio(walk(carrier.onTime, 0.94, 0.006, random));
        const status = slaOf(onTime);
        if (status === "breach" && carrier.status !== "breach") {
            raised.push({
                severity: "warning",
                message: `${carrier.name} fell below its SLA (${Math.round(onTime * 100)}% on time)`,
                at: clock,
                acknowledged: false,
            });
        }
        return {
            ...carrier,
            shipped: carrier.shipped + 1 + Math.floor(random() * 6),
            onTime,
            status,
        };
    });

    if (backlog.value > 360 && snapshot.backlog.value <= 360) {
        raised.push({
            severity: "warning",
            message: `Backlog over 360 orders in pick zone ${pick(ZONES, random)}`,
            at: clock,
            acknowledged: false,
        });
    }
    // the shift's first critical comes early, the next ones rarely, never two at once
    const critical =
        !snapshot.critical &&
        (tick === FIRST_CRITICAL_TICK ||
            (tick > FIRST_CRITICAL_TICK && random() < 0.004));
    if (critical) {
        raised.push({
            severity: "critical",
            message:
                tick === FIRST_CRITICAL_TICK
                    ? (CRITICALS[0] as string)
                    : pick(CRITICALS, random),
            at: clock,
            acknowledged: false,
        });
    }

    let alerts = snapshot.alerts;
    for (const alert of raised) {
        alerts = [{ ...alert, id: nextId(alerts) }, ...alerts];
    }
    // the oldest are dropped, never a critical alert that still waits
    const waiting = oldestCritical(alerts);
    alerts = alerts.slice(0, MAX_ALERTS);
    if (waiting && !alerts.includes(waiting)) {
        alerts = [...alerts.slice(0, MAX_ALERTS - 1), waiting];
    }
    return {
        ...snapshot,
        tick,
        clock,
        orders,
        pickRate,
        onTime,
        shipped,
        backlog,
        docks,
        carriers,
        alerts,
        critical: oldestCritical(alerts),
    };
}

/** The snapshot with alert `id` acknowledged. */
export function acknowledged(snapshot: Snapshot, id: number): Snapshot {
    const alerts = snapshot.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert,
    );
    return { ...snapshot, alerts, critical: oldestCritical(alerts) };
}

/**
 * The shift's feed: while it plays, a tick every `interval` milliseconds, each one a new
 * snapshot told to the listeners. It also stops, without changing `playing`, while the page is
 * hidden or the element it watches is off screen, and goes on where it was when they come back.
 */
export interface FulfillmentFeed {
    /** the shift now */
    readonly snapshot: Snapshot;
    play(): void;
    pause(): void;
    /** advances one tick now, playing or not (what a test steps with) */
    step(): void;
    acknowledge(alertId: number): void;
    /** tells `listener` every new snapshot; returns the unsubscribe */
    subscribe(listener: () => void): () => void;
    /** stops ticking while `element` is off screen or its page hidden; returns the unwatch */
    watch(element: Element): () => void;
}

export function createFulfillmentFeed(
    options: { readonly seed?: number; readonly interval?: number } = {},
): FulfillmentFeed {
    const seed = options.seed ?? 1;
    const interval = options.interval ?? 500;
    const random = randomSource(seed + 1);
    const listeners = new Set<() => void>();
    let snapshot = initialSnapshot(seed);
    let timer: ReturnType<typeof setInterval> | undefined;
    // what keeps it from ticking besides a pause: the page hidden, the dashboard off screen
    let hidden = false;
    let offscreen = false;

    function set(next: Snapshot) {
        snapshot = next;
        for (const listener of listeners) listener();
    }

    function schedule() {
        const run = snapshot.playing && !hidden && !offscreen;
        if (run && timer === undefined) {
            timer = setInterval(() => set(advance(snapshot, random)), interval);
        } else if (!run && timer !== undefined) {
            clearInterval(timer);
            timer = undefined;
        }
    }

    return {
        get snapshot() {
            return snapshot;
        },
        play() {
            if (snapshot.playing) return;
            set({ ...snapshot, playing: true });
            schedule();
        },
        pause() {
            if (!snapshot.playing) return;
            set({ ...snapshot, playing: false });
            schedule();
        },
        step() {
            set(advance(snapshot, random));
        },
        acknowledge(alertId) {
            set(acknowledged(snapshot, alertId));
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        watch(element) {
            const document = element.ownerDocument;
            const view = document.defaultView;
            const onVisibility = () => {
                hidden = document.visibilityState === "hidden";
                schedule();
            };
            onVisibility();
            document.addEventListener("visibilitychange", onVisibility);
            const observer =
                view && "IntersectionObserver" in view
                    ? new view.IntersectionObserver(([entry]) => {
                          offscreen = entry ? !entry.isIntersecting : false;
                          schedule();
                      })
                    : undefined;
            observer?.observe(element);
            return () => {
                document.removeEventListener("visibilitychange", onVisibility);
                observer?.disconnect();
                hidden = false;
                offscreen = false;
                schedule();
            };
        },
    };
}

/** Whether the reader asked for less motion: the feed then starts paused. */
export function prefersReducedMotion(
    view: Window | null = globalThis.window,
): boolean {
    return (
        view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    );
}

/** Simulated seconds since midnight as a clock, "14:03:25". */
export function formatClock(seconds: number): string {
    const h = Math.floor(seconds / 3600) % 24;
    const m = Math.floor(seconds / 60) % 60;
    const s = Math.floor(seconds) % 60;
    return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

/** A share from 0 to 1 as a percentage, one decimal: "96.2%". */
export function formatShare(share: number): string {
    return `${(share * 100).toFixed(1)}%`;
}

/** A count, grouped: "2,418". */
export function formatCount(count: number): string {
    return count.toLocaleString("en-US");
}

/** A change as a signed percentage, one decimal, with a real minus: "+1.2%", "−0.4%". */
export function formatDelta(change: number): string {
    const percent = Math.round(change * 1000) / 10;
    const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
    return `${sign}${Math.abs(percent).toFixed(1)}%`;
}
