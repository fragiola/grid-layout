"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The grid's cells drawn behind the items, shown only while something moves: `Cells` renders one
// element per cell, placed like a 1 × 1 item, down to the layout's bottom plus a row (the
// preview's, while a drag runs). Their look is the app's: here a dotted outline that fades in
// while the root carries `data-dragging`, `data-resizing` or `data-grabbed` (styles.ts).
export default function GridBackground() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                rowHeight={56}
                gap={[10, 10]}
                aria-label="Dashboard"
                className={styles.root}
            >
                {/* first: drawn under the items */}
                <GridLayout.Cells className={styles.cell} />
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
    );
}
