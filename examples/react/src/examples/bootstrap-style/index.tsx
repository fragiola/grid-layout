"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { useState } from "react";
import { WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 };

/** Each card's width at each breakpoint, of twelve columns. */
const WIDTHS: Record<string, number> = { lg: 3, md: 4, sm: 6, xs: 12 };

const CARDS = WIDGETS.slice(0, 8);

/** The cards in reading order, `w` columns each: a full row, then the next. */
function rows(w: number): Layout {
    return CARDS.map((card, index) => ({
        id: card.id,
        x: (index * w) % 12,
        y: Math.floor((index * w) / 12) * 2,
        w,
        h: 2,
    }));
}

const LAYOUTS = Object.fromEntries(
    Object.entries(WIDTHS).map(([name, w]) => [name, rows(w)]),
);

// The same twelve columns at every breakpoint; what changes is each card's width, given per
// breakpoint as its own layout. Every layout is given, so none is generated.
export default function BootstrapStyle() {
    const [at, setAt] = useState("lg");
    return (
        <div className={styles.frame}>
            <p className={styles.note} data-testid="breakpoint">
                {at}: each card is {WIDTHS[at]} of 12 columns
            </p>
            <GridLayout.Root
                breakpoints={BREAKPOINTS}
                cols={12}
                defaultLayouts={LAYOUTS}
                onBreakpointChange={setAt}
                rowHeight={44}
                gap={[12, 12]}
                aria-label="Cards"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const card = CARDS.find((each) => each.id === item.id);
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={card?.title ?? item.id}
                                className={styles.item}
                            >
                                <span className={styles.title}>
                                    {card?.title}
                                </span>
                                <span className={styles.value}>
                                    {card?.value}
                                </span>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
