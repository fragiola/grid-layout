"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5];

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
    { id: "orders", x: 3, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 6, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 4, h: 2 },
    { id: "latency", x: 4, y: 2, w: 4, h: 2 },
];

// The grid on a zoomable canvas: a `transform: scale()` on a wrapper draws it smaller or larger
// without changing its layout. The grid reads the scale off its own box when a gesture starts,
// so a held item stays under the pointer and lands where it is dropped at any zoom, with no
// `scale` prop (pass one only when the box cannot tell, e.g. a scale animated mid-gesture).
export default function ScaledContainer() {
    const [zoom, setZoom] = useState(1);
    return (
        <div className={styles.frame}>
            <fieldset aria-label="Zoom" className={styles.segments}>
                {ZOOMS.map((value) => (
                    <Clickable.Button
                        key={value}
                        size="sm"
                        variant={value === zoom ? "solid" : "outline"}
                        className={styles.segment(value === zoom)}
                        aria-pressed={value === zoom}
                        onClick={() => setZoom(value)}
                    >
                        {value * 100}%
                    </Clickable.Button>
                ))}
            </fieldset>
            <div className={styles.viewport}>
                {/* the canvas's zoom: an app's transform, the grid inside it unaware */}
                <div
                    className={styles.canvas}
                    style={{ transform: `scale(${zoom})` }}
                >
                    <GridLayout.Root
                        defaultLayout={layout}
                        cols={8}
                        rowHeight={48}
                        gap={[10, 10]}
                        padding={[10, 10]}
                        aria-label="Zoomed dashboard"
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
                                        <span className={styles.place}>
                                            column {item.x}, row {item.y} ·{" "}
                                            {item.w} × {item.h}
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
                        <GridLayout.Placeholder
                            className={styles.placeholder}
                        />
                    </GridLayout.Root>
                </div>
            </div>
        </div>
    );
}
