"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

/** Every widget twice over, three to a row: far taller than the frame. */
const LAYOUT: Layout = [...WIDGETS, ...WIDGETS].map((entry, index) => ({
    id: index < WIDGETS.length ? entry.id : `${entry.id}-2`,
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 2,
    w: 4,
    h: 2,
}));

// The frame scrolls, not the page. Near its top or bottom edge a widget held there (or a corner
// pulled there) scrolls it, faster the closer to the edge (R6), so a widget can be carried from
// the first row to the last in one gesture. `autoScroll` sets the zone and the speed.
export default function LongDashboard() {
    return (
        <div className={styles.frame} data-testid="scroller">
            <GridLayout.Root
                defaultLayout={LAYOUT}
                rowHeight={52}
                gap={[12, 12]}
                autoScroll={{ threshold: 48, speed: 24 }}
                aria-label="Long dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const content = widget(item.id.replace(/-2$/, ""));
                        const title = item.id.endsWith("-2")
                            ? `${content.title} (2)`
                            : content.title;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={title}
                                className={styles.item}
                            >
                                <span className={styles.title}>{title}</span>
                                <span className={styles.value}>
                                    {content.value}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${title}`}
                                    className={styles.resizeHandle}
                                />
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
