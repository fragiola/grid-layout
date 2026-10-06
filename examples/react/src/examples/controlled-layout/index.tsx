"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { RotateCcw, Shuffle } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const COLS = 12;

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
    { id: "orders", x: 4, y: 0, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 3, h: 2 },
    { id: "latency", x: 3, y: 2, w: 5, h: 2 },
    { id: "uptime", x: 8, y: 2, w: 4, h: 2 },
];

/**
 * The same items in another order, packed row by row: inside the columns and never overlapping
 * (the grid settles what compaction would lift). Never the order it had.
 */
function shuffled(layout: Layout): Layout {
    const order = (items: Layout) => items.map((item) => item.id).join();
    let next = [...layout];
    while (next.length > 1 && order(next) === order(layout)) {
        next = [...layout].sort(() => Math.random() - 0.5);
    }
    let x = 0;
    let y = 0;
    let tallest = 0;
    return next.map((item) => {
        if (x + item.w > COLS) {
            x = 0;
            y += tallest;
            tallest = 0;
        }
        const placed = { ...item, x, y };
        x += item.w;
        tallest = Math.max(tallest, item.h);
        return placed;
    });
}

/** One line per item: what the state holds, readable. */
const json = (layout: Layout) =>
    `[\n${layout.map((item) => `  ${JSON.stringify({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })}`).join(",\n")}\n]`;

// The layout lives in React state: `layout` gives it to the grid and `onLayoutChange` takes each
// committed change back, once per drag or resize (never during one). Reset and Shuffle only set
// the state; the grid follows. The JSON is the state itself, not a copy of the grid's.
export default function ControlledLayout() {
    const [layout, setLayout] = useState<Layout>(START);
    const [changes, setChanges] = useState(0);
    return (
        <div className={styles.frame}>
            <div className={styles.main}>
                <div className={styles.toolbar}>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLayout(shuffled(layout))}
                    >
                        <Shuffle aria-hidden="true" />
                        Shuffle
                    </Clickable.Button>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLayout(START)}
                    >
                        <RotateCcw aria-hidden="true" />
                        Reset
                    </Clickable.Button>
                    <p className={styles.note}>
                        onLayoutChange calls:{" "}
                        <span data-testid="changes">{changes}</span>
                    </p>
                </div>
                <GridLayout.Root
                    layout={layout}
                    onLayoutChange={(next) => {
                        setLayout(next);
                        setChanges((count) => count + 1);
                    }}
                    cols={COLS}
                    rowHeight={48}
                    gap={[10, 10]}
                    aria-label="Dashboard"
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
            <section aria-labelledby="state-title" className={styles.panel}>
                <h2 id="state-title" className={styles.panelTitle}>
                    React state
                </h2>
                <pre data-testid="state" className={styles.json}>
                    {json(layout)}
                </pre>
            </section>
        </div>
    );
}
