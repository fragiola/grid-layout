"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { messy } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// A layout no grid would take as it is: items overlap, one runs past the last column, one starts
// left of the first, one has no row (`y: Infinity`). The grid corrects it and tells the app, once,
// through onLayoutChange; holding the layout in state, the app keeps what holds.
export default function MessyLayout() {
    const [layout, setLayout] = useState<Layout>(messy);
    const [corrections, setCorrections] = useState(0);
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <p className={styles.note} aria-live="polite">
                    Layout changes told: {corrections}
                </p>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLayout(messy())}
                >
                    Mess it up again
                </Clickable.Button>
            </div>
            <GridLayout.Root
                layout={layout}
                onLayoutChange={(next) => {
                    setLayout(next);
                    setCorrections((count) => count + 1);
                }}
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Corrected layout"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={widget(item.id).title}
                            className={styles.item}
                        >
                            <span className={styles.title}>
                                {widget(item.id).title}
                            </span>
                            <code className={styles.box}>
                                {item.x},{item.y} · {item.w}×{item.h}
                            </code>
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
