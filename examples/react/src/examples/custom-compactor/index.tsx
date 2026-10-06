"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { widget } from "../_kit/widgets";
import { gravityCompactor } from "./gravity";
import * as styles from "./styles";

/** Four shelves, the widgets scattered along them: the compactor slides them to the start. */
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 1 },
    { id: "orders", x: 6, y: 0, w: 3, h: 1 },
    { id: "visitors", x: 2, y: 1, w: 3, h: 1 },
    { id: "conversion", x: 7, y: 1, w: 3, h: 1 },
    { id: "refunds", x: 0, y: 2, w: 5, h: 1 },
    { id: "latency", x: 8, y: 2, w: 4, h: 1 },
    { id: "uptime", x: 4, y: 3, w: 4, h: 1 },
];

// A compactor of your own (gravity.ts): rows are shelves, and every widget slides toward the
// start of its shelf until it meets another. Drop one at the end of a row and it slides back
// against the last one there; the shelves never close up. `createCompactor` (from
// `/compactors`) does the bookkeeping: the order, the statics, a copy that is never the input.
export default function CustomCompactor() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                compactor={gravityCompactor}
                rowHeight={56}
                gap={[10, 10]}
                aria-label="Shelves"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const content = widget(item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={content.title}
                                className={styles.item}
                            >
                                <span className={styles.title}>
                                    {content.title}
                                </span>
                                <span className={styles.value}>
                                    {content.value}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="end"
                                    aria-label={`Resize ${content.title}`}
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
