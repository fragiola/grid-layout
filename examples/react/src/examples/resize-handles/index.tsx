"use client";

import {
    GridLayout,
    type Layout,
    type ResizeSide,
} from "@fragiola/grid-layout-react";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Every side and corner a person can pull: logical ones, so in right-to-left `start` is the right
// edge and nothing else changes. Where each handle sits and what it looks like is the app's: here,
// thin bars on the edges and squares on the corners, shown on hover and focus.
const SIDES: readonly ResizeSide[] = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
];

const layout: Layout = [
    { id: "revenue", x: 1, y: 1, w: 4, h: 3 },
    { id: "orders", x: 6, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 6, y: 3, w: 4, h: 2 },
];

export default function ResizeHandles() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={48}
                gap={[12, 12]}
                aria-label="Resizable widgets"
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
                                <span className={styles.size}>
                                    {item.w} × {item.h}
                                </span>
                                {SIDES.map((side) => (
                                    <GridLayout.ResizeHandle
                                        key={side}
                                        side={side}
                                        aria-label={`Resize ${content.title} from the ${side.replace("-", " ")}`}
                                        className={styles.handle(side)}
                                    />
                                ))}
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
