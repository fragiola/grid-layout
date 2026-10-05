"use client";

import { GridLayout } from "@fragiola/grid-layout-react";
import { useId, useState } from "react";
import { Switch } from "#/components/ui/switch";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// `bounded`: a dragged item stays inside the root, whatever the pointer does. Off, it follows
// the pointer past the edges and lands on the nearest cell inside.
export default function Bounded() {
    const [bounded, setBounded] = useState(true);
    const label = useId();
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.option}>
                    <Switch.Root
                        aria-labelledby={label}
                        checked={bounded}
                        onCheckedChange={setBounded}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={label}>Keep dragged items inside the grid</span>
                </span>
            </div>
            <GridLayout.Root
                defaultLayout={layout}
                bounded={bounded}
                rowHeight={56}
                gap={[12, 12]}
                aria-label="Bounded dashboard"
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
                            <span className={styles.value}>
                                {widget(item.id).value}
                            </span>
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
