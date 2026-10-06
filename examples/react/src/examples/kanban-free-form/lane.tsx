import { GridLayout, useGridLayoutView } from "@fragiola/grid-layout-react";
import * as styles from "./styles";

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

/** A lane's header: a static item across its four columns, with how many notes it holds. */
export function LaneHeader({ id }: { id: string }) {
    const { layout } = useGridLayoutView();
    const index = LANES.findIndex((lane) => lane.id === id);
    const title = LANES[index]?.title ?? id;
    // a note belongs to the lane its middle is over
    const count = layout.filter(
        (item) => !item.static && laneOf(item.x + item.w / 2 - 0.5) === index,
    ).length;
    return (
        <GridLayout.Item itemId={id} aria-label={title} className={styles.lane}>
            <span className={styles.laneTitle}>{title}</span>
            <span className={styles.laneCount}>{count}</span>
        </GridLayout.Item>
    );
}
