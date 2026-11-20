// Hand-drawn SVG charts for the dashboards: the geometry only (paths, bars and axis ticks in
// pixels for a box of a given size), so a chart drawn by React, Vue or Angular is the same
// drawing. A chart is drawn at its box's real size, not stretched: when its tile is resized it
// shows more or fewer points and ticks, and its lines keep their width. No grid, no styles.

/** A chart's box, in pixels. */
export interface ChartSize {
    readonly width: number;
    readonly height: number;
}

/** Room left under and beside the plot for the axis labels, in pixels. */
export const CHART_INSET = { start: 30, bottom: 4, top: 6 } as const;

/** One horizontal guide of a chart: where it is drawn and the value it marks. */
export interface Tick {
    readonly y: number;
    readonly value: number;
}

/** The last points of `points` that fit `width` at `spacing` pixels each, at least two. */
export function visible(
    points: readonly number[],
    width: number,
    spacing: number,
): readonly number[] {
    const count = Math.max(2, Math.floor(width / spacing) + 1);
    return points.slice(-count);
}

/** A round step for about `count` guides between 0 and `max`. */
function niceStep(max: number, count: number): number {
    const raw = max / Math.max(count, 1);
    const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
    const scaled = raw / magnitude;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * magnitude;
}

/** The scale of a plot: from 0 to a round top above every point, and its guides. */
export interface Scale {
    readonly top: number;
    readonly ticks: readonly Tick[];
    /** the y of a value, in pixels */
    y(value: number): number;
}

/** A scale for values up to `max` in a box of `height`: a guide about every 36 pixels. */
export function scaleOf(max: number, height: number): Scale {
    const plot = Math.max(height - CHART_INSET.top - CHART_INSET.bottom, 1);
    const step = niceStep(max * 1.1, Math.max(1, Math.floor(plot / 36)));
    const top = Math.max(step, Math.ceil((max * 1.1) / step) * step);
    const y = (value: number) =>
        CHART_INSET.top + plot - (Math.min(value, top) / top) * plot;
    const ticks: Tick[] = [];
    for (let value = 0; value <= top + step / 2; value += step) {
        ticks.push({ y: y(value), value });
    }
    return { top, ticks, y };
}

/** A line through `points`, spread over the plot's width (after the axis labels). */
export function linePath(
    points: readonly number[],
    size: ChartSize,
    scale: Scale,
): string {
    const plot = Math.max(size.width - CHART_INSET.start, 1);
    const last = Math.max(points.length - 1, 1);
    return points
        .map((point, index) => {
            const x = CHART_INSET.start + (index / last) * plot;
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${scale.y(point).toFixed(1)}`;
        })
        .join(" ");
}

/** The area under a line from {@link linePath}: the line closed along the plot's bottom. */
export function areaPath(line: string, size: ChartSize, scale: Scale): string {
    const bottom = scale.y(0).toFixed(1);
    return `${line} L${size.width.toFixed(1)},${bottom} L${CHART_INSET.start},${bottom} Z`;
}

/** One bar of a column chart, in pixels. */
export interface Bar {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly value: number;
}

/** One column per point, side by side over the plot's width, a gap between them. */
export function columns(
    points: readonly number[],
    size: ChartSize,
    scale: Scale,
): readonly Bar[] {
    const plot = Math.max(size.width - CHART_INSET.start, 1);
    const pitch = plot / Math.max(points.length, 1);
    const gap = Math.min(4, pitch * 0.3);
    const bottom = scale.y(0);
    return points.map((value, index) => {
        const y = scale.y(value);
        return {
            x: CHART_INSET.start + index * pitch + gap / 2,
            y,
            width: Math.max(pitch - gap, 1),
            height: Math.max(bottom - y, 0),
            value,
        };
    });
}

/** A guide's label: short, "1.2k" over a thousand. */
export function tickLabel(value: number): string {
    return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}
