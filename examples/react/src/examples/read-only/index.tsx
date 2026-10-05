"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// A layout that only shows: `draggable` and `resizable` off for the whole grid. The same items,
// no gesture, and no tab stops of their own (they are not something to move).
export default function ReadOnly() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                draggable={false}
                resizable={false}
                rowHeight={64}
                gap={[12, 12]}
                aria-label="Read-only dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const content = widget(item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={content.title}
                                tabIndex={-1}
                                className={styles.item}
                            >
                                <span className={styles.title}>
                                    {content.title}
                                </span>
                                <span className={styles.value}>
                                    {content.value}
                                </span>
                                <span className={styles.change}>
                                    {formatChange(content.change)}
                                </span>
                                {/* never shown: the grid does not resize */}
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${content.title}`}
                                />
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
            </GridLayout.Root>
        </div>
    );
}
