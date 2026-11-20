import { describe, expect, it } from "vitest";
import {
    columns,
    linePath,
    scaleOf,
    visible,
} from "../src/examples/_kit/charts";
import {
    acknowledged,
    advance,
    FIRST_CRITICAL_TICK,
    formatClock,
    formatDelta,
    HISTORY,
    initialSnapshot,
    randomSource,
} from "../src/examples/_kit/fulfillment";

// The fulfillment center's simulation and chart geometry: pure, seeded, the same in every
// framework (Vue's and Angular's `_kit` are copies of these files).

/** `ticks` ticks from the start of the shift. */
function run(ticks: number, seed = 1) {
    const random = randomSource(seed + 1);
    let snapshot = initialSnapshot(seed);
    for (let tick = 0; tick < ticks; tick++) {
        snapshot = advance(snapshot, random);
    }
    return snapshot;
}

describe("the fulfillment simulation", () => {
    it("gives the same shift for the same seed, another for another", () => {
        expect(run(40)).toEqual(run(40));
        expect(run(40, 2).orders.history).not.toEqual(run(40).orders.history);
    });

    it("never changes the snapshot it advances", () => {
        const start = Object.freeze(initialSnapshot());
        const copy = structuredClone(start);
        advance(start, randomSource(9));
        expect(start).toEqual(copy);
    });

    it("keeps a fixed history and moves the clock five seconds a tick", () => {
        const later = run(10);
        expect(later.orders.history).toHaveLength(HISTORY);
        expect(later.clock - initialSnapshot().clock).toBe(50);
        expect(formatClock(later.clock)).toBe("14:00:50");
    });

    it("raises the first critical alert a few ticks in, until it is acknowledged", () => {
        expect(run(FIRST_CRITICAL_TICK - 1).critical).toBeUndefined();
        const raised = run(FIRST_CRITICAL_TICK);
        expect(raised.critical?.severity).toBe("critical");
        expect(raised.alerts[0]).toBe(raised.critical);
        const calm = acknowledged(raised, raised.critical?.id ?? 0);
        expect(calm.critical).toBeUndefined();
        expect(calm.alerts[0]?.acknowledged).toBe(true);
    });

    it("writes a change with its sign and a real minus", () => {
        expect(formatDelta(0.0123)).toBe("+1.2%");
        expect(formatDelta(-0.004)).toBe("−0.4%");
        expect(formatDelta(0)).toBe("0.0%");
    });
});

describe("the chart geometry", () => {
    it("shows as many recent points as the width fits", () => {
        const points = Array.from({ length: 96 }, (_, index) => index);
        expect(visible(points, 80, 8)).toEqual(points.slice(-11));
        expect(visible(points, 0, 8)).toHaveLength(2);
    });

    it("scales to a round top with a guide about every 36 pixels", () => {
        const scale = scaleOf(140, 200);
        expect(scale.top).toBeGreaterThanOrEqual(154);
        expect(scale.ticks[0]?.value).toBe(0);
        expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
        expect(scale.y(0)).toBeGreaterThan(scale.y(scale.top));
    });

    it("draws inside the box it is given", () => {
        const size = { width: 300, height: 120 };
        const scale = scaleOf(10, size.height);
        const coordinates = linePath([1, 5, 10], size, scale)
            .split(/[ML ]+/)
            .filter(Boolean)
            .map((pair) => pair.split(",").map(Number));
        for (const [x = -1, y = -1] of coordinates) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(size.width);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(size.height);
        }
        const bars = columns([2, 4, 8, 10], size, scale);
        expect(bars).toHaveLength(4);
        const last = bars.at(-1);
        expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(
            size.width,
        );
    });
});
