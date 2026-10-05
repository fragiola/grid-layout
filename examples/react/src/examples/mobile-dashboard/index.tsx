"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { tablet: 600, phone: 0 };
const COLS = { tablet: 4, phone: 1 };

// On a phone a card's body is held before it moves (R5): a swipe scrolls the page as always, a
// hold of a quarter second lifts the card, which says so through `data-pressing` while the hold
// lasts (the look is the app's: here a ring and a slight shrink). Near the frame's edges a held
// card scrolls it (R6). The phone breakpoint is the grid's own width's: this frame is narrow.
export default function MobileDashboard() {
    return (
        <div className={styles.frame}>
            <div className={styles.phone} data-testid="phone">
                <p className={styles.hint}>
                    Swipe to scroll. Hold a card, then move it.
                </p>
                <GridLayout.Root
                    breakpoints={BREAKPOINTS}
                    cols={COLS}
                    defaultLayouts={{
                        tablet: dashboard().map((item) => ({ ...item, w: 2 })),
                    }}
                    rowHeight={88}
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
                                    <span className={styles.change}>
                                        {formatChange(content.change)}
                                    </span>
                                </GridLayout.Item>
                            );
                        }}
                    </GridLayout.Items>
                    <GridLayout.Placeholder className={styles.placeholder} />
                </GridLayout.Root>
            </div>
        </div>
    );
}
