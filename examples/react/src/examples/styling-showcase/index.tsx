"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { GripHorizontal } from "lucide-react";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 5, h: 3 },
    { id: "orders", x: 5, y: 0, w: 4, h: 2 },
    { id: "signups", x: 9, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 5, y: 2, w: 7, h: 2 },
    { id: "nps", x: 0, y: 3, w: 2, h: 2 },
    { id: "latency", x: 2, y: 3, w: 3, h: 2 },
    { id: "uptime", x: 5, y: 4, w: 7, h: 2 },
];

// Everything the grid layout looks like, from outside: cards glide into place, the one held
// lifts and tilts a little (the `rotate` and `scale` properties, so the engine's `transform`
// stays its own), the placeholder is striped, and the grip and the corner appear on hover or
// focus. All of it in styles.ts, read from data-* and the theme's tokens.
export default function StylingShowcase() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={60}
                gap={[14, 14]}
                aria-label="Showcase dashboard"
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
                                <span className={styles.header}>
                                    <span className={styles.title}>
                                        {content.title}
                                    </span>
                                    <GridLayout.DragHandle
                                        aria-label={`Move ${content.title}`}
                                        className={styles.grip}
                                    >
                                        <GripHorizontal aria-hidden="true" />
                                    </GridLayout.DragHandle>
                                </span>
                                <span className={styles.figure}>
                                    <span className={styles.value}>
                                        {content.value}
                                    </span>
                                    <span
                                        className={styles.change(
                                            content.change,
                                        )}
                                    >
                                        {formatChange(content.change)}
                                    </span>
                                </span>
                                <svg
                                    viewBox="0 0 100 32"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    className={styles.chart}
                                >
                                    <path
                                        d={`${sparkline(content.points)} L100,32 L0,32 Z`}
                                        className={styles.area}
                                    />
                                    <path
                                        d={sparkline(content.points)}
                                        className={styles.line}
                                    />
                                </svg>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${content.title}`}
                                    className={styles.corner}
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
