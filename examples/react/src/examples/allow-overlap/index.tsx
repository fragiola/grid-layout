"use client";

import {
    GridLayout,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-react";
import * as styles from "./styles";

// allowOverlap: nothing is pushed and nothing settles, so items stack wherever they are dropped,
// like notes on a board. The one dragged last stays on top only while it is held: what is drawn
// over what afterwards is the app's (here, the layout's order).
const notes: Layout = [
    { id: "Call the supplier", x: 0, y: 0, w: 3, h: 2 },
    { id: "Review the Q3 plan", x: 2, y: 1, w: 3, h: 2 },
    { id: "Book the venue", x: 6, y: 0, w: 3, h: 2 },
    { id: "Ship the release", x: 7, y: 1, w: 3, h: 3 },
];

export default function AllowOverlap() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={notes}
                compactor={noCompactor}
                allowOverlap
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Notes"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={item.id}
                            className={styles.item}
                        >
                            {item.id}
                            <GridLayout.ResizeHandle
                                side="bottom-end"
                                aria-label={`Resize ${item.id}`}
                                className={styles.resizeHandle}
                            />
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
            </GridLayout.Root>
        </div>
    );
}
