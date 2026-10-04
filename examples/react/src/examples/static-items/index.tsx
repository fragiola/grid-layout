"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { Pin } from "lucide-react";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Two statics: a banner across the top and a pinned widget. A static never moves, by a person
// or by compaction: the other items flow around it, and one dropped on it goes around it too.
const layout: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "uptime", x: 8, y: 1, w: 4, h: 2, static: true },
    { id: "visitors", x: 0, y: 3, w: 6, h: 2 },
    { id: "latency", x: 6, y: 3, w: 6, h: 2 },
];

export default function StaticItems() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={56}
                gap={[12, 12]}
                aria-label="Dashboard with pinned items"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const name =
                            item.id === "banner"
                                ? "Announcements"
                                : widget(item.id).title;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={name}
                                className={styles.item}
                            >
                                <span className={styles.title}>
                                    {item.static ? (
                                        <Pin
                                            aria-label="Pinned"
                                            className={styles.pin}
                                        />
                                    ) : null}
                                    {name}
                                </span>
                                {item.id === "banner" ? (
                                    <span className={styles.note}>
                                        Statics stay put; the rest flow around
                                        them.
                                    </span>
                                ) : (
                                    <span className={styles.value}>
                                        {widget(item.id).value}
                                    </span>
                                )}
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
