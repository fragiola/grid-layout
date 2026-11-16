// The board's lanes: app data.

/** The board's lanes, four columns each, start to end. */
export const LANES = [
    { id: "lane-todo", title: "To do" },
    { id: "lane-doing", title: "Doing" },
    { id: "lane-done", title: "Done" },
] as const;

/** Which lane a column is in. */
export function laneOf(x: number): number {
    return Math.min(Math.floor(x / 4), LANES.length - 1);
}
