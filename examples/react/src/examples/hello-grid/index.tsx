"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

export default function HelloGrid() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                cols={12}
                rowHeight={64}
                gap={[12, 12]}
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
                                <span className={styles.change(content.change)}>
                                    {formatChange(content.change)}
                                </span>
                                <svg
                                    viewBox="0 0 100 32"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    className={styles.chart}
                                >
                                    <path d={sparkline(content.points)} />
                                </svg>
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
