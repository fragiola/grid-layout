"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Each item's own limits: a resize stops at them, whichever side pulls. They are part of the
// layout (minW, maxW, minH, maxH), so a layout that breaks them is corrected on load too.
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "orders", x: 3, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    { id: "visitors", x: 7, y: 0, w: 3, h: 2, maxW: 3, maxH: 3 },
    { id: "latency", x: 0, y: 2, w: 6, h: 1, minH: 1, maxH: 1 },
];

const limits = (item: Layout[number]) =>
    [
        `width ${item.minW ?? 1}–${item.maxW ?? "∞"}`,
        `height ${item.minH ?? 1}–${item.maxH ?? "∞"}`,
    ].join(", ");

export default function MinMaxSize() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={56}
                gap={[12, 12]}
                aria-label="Widgets with size limits"
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
                                    {item.w} × {item.h}
                                </span>
                                <span className={styles.note}>
                                    {limits(item)}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
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
