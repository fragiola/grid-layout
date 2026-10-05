"use client";

import {
    type Compactor,
    GridLayout,
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-react";
import { useId, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { scattered } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const MODES: { name: string; compactor: Compactor }[] = [
    { name: "Vertical", compactor: verticalCompactor },
    { name: "Horizontal", compactor: horizontalCompactor },
    { name: "None", compactor: noCompactor },
];

const ids = WIDGETS.map((entry) => entry.id);

// How a layout settles after every change. Vertical (the default) lifts items into the gaps
// above; horizontal pulls them toward the start; none leaves them where they are put, pushing
// down only what would overlap. preventCollision refuses a move into an occupied cell instead of
// pushing. The same scattered layout, settled each way.
export default function CompactionModes() {
    const [mode, setMode] = useState(0);
    const [preventCollision, setPreventCollision] = useState(false);
    const [count, setCount] = useState(8);
    const label = useId();
    const current = MODES[mode] ?? MODES[0];
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <fieldset aria-label="Compaction" className={styles.segments}>
                    {MODES.map((entry, index) => (
                        <Clickable.Button
                            key={entry.name}
                            size="sm"
                            variant={index === mode ? "solid" : "outline"}
                            className={styles.segment(index === mode)}
                            aria-pressed={index === mode}
                            onClick={() => setMode(index)}
                        >
                            {entry.name}
                        </Clickable.Button>
                    ))}
                </fieldset>
                <span className={styles.option}>
                    <Switch.Root
                        aria-labelledby={label}
                        checked={preventCollision}
                        onCheckedChange={setPreventCollision}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={label}>Prevent collisions</span>
                </span>
                <span className={styles.option}>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        aria-label="Fewer items"
                        onClick={() => setCount(Math.max(2, count - 2))}
                    >
                        −
                    </Clickable.Button>
                    <output aria-label="Items" className={styles.count}>
                        {count}
                    </output>
                    <Clickable.Button
                        size="sm"
                        variant="outline"
                        aria-label="More items"
                        onClick={() => setCount(Math.min(24, count + 2))}
                    >
                        +
                    </Clickable.Button>
                </span>
            </div>
            <GridLayout.Root
                // a new layout for a new count: `defaultLayout` is read when a grid starts
                key={count}
                defaultLayout={scattered(ids, count, 12)}
                compactor={current?.compactor}
                preventCollision={preventCollision}
                rowHeight={48}
                gap={[10, 10]}
                aria-label={`${current?.name} compaction`}
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={item.id}
                            className={styles.item}
                        >
                            <span className={styles.title}>
                                {widget(item.id.split("-")[0] ?? item.id).title}
                            </span>
                        </GridLayout.Item>
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
