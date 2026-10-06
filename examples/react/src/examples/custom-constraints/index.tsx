"use client";

import {
    GridLayout,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    snapToGrid,
    verticalCompactor,
} from "@fragiola/grid-layout-react";
import { useId, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import {
    evenColumns,
    maxArea,
    minHeightFromWidth,
    topHalf,
} from "./constraints";
import * as styles from "./styles";

const MAX_ROWS = 12;

// The app's own rules, each after the defaults (gridBounds, minMaxSize), in stable lists: a new
// list configures the grid again. `rule` is the heart of each one, shown above the grid.
const RULES: {
    name: string;
    constraints: readonly LayoutConstraint[];
    rule: string;
}[] = [
    { name: "None", constraints: [gridBounds, minMaxSize], rule: "" },
    {
        name: "Even columns",
        constraints: [gridBounds, minMaxSize, evenColumns],
        rule: "position: x = Math.round(item.x / 2) * 2",
    },
    {
        name: "Height ≥ width ÷ 2",
        constraints: [gridBounds, minMaxSize, minHeightFromWidth],
        rule: "size: h = Math.max(item.h, Math.ceil(item.w / 2))",
    },
    {
        name: "Area ≤ 12",
        constraints: [gridBounds, minMaxSize, maxArea(12)],
        rule: "size: w × h ≤ 12, the pulled side gives way",
    },
    {
        name: "Top half",
        constraints: [gridBounds, minMaxSize, topHalf],
        rule: "position: y ≤ maxRows ÷ 2 − item.h",
    },
    {
        name: "Snap to 3",
        constraints: [gridBounds, minMaxSize, snapToGrid(3)],
        rule: "snapToGrid(3): x and y round to multiples of 3 (built in)",
    },
];

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 3, h: 2 },
    { id: "e", x: 10, y: 0, w: 2, h: 2 },
    { id: "f", x: 0, y: 2, w: 4, h: 2 },
    { id: "g", x: 4, y: 3, w: 4, h: 2 },
    { id: "h", x: 8, y: 2, w: 4, h: 2 },
];

// Constraints written in the app (constraints.ts) next to the built-in snapToGrid: pick one and
// drag or resize, by pointer or keyboard. Compaction runs after the constraints, so a position
// rule on rows shows best without it.
export default function CustomConstraints() {
    const [chosen, setChosen] = useState(0);
    const [compact, setCompact] = useState(true);
    const label = useId();
    const current = RULES[chosen] ?? RULES[0];
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <fieldset aria-label="Custom rule" className={styles.segments}>
                    {RULES.map((entry, index) => (
                        <Clickable.Button
                            key={entry.name}
                            size="sm"
                            variant={index === chosen ? "solid" : "outline"}
                            className={styles.segment(index === chosen)}
                            aria-pressed={index === chosen}
                            onClick={() => setChosen(index)}
                        >
                            {entry.name}
                        </Clickable.Button>
                    ))}
                </fieldset>
                <span className={styles.option}>
                    <Switch.Root
                        aria-labelledby={label}
                        checked={compact}
                        onCheckedChange={setCompact}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={label}>Vertical compaction</span>
                </span>
            </div>
            <p className={styles.note}>
                <code className={styles.code}>
                    [
                    {current?.constraints
                        .map((constraint) => constraint.name)
                        .join(", ")}
                    ]
                </code>
                {current?.rule && (
                    <code className={styles.rule}>{current.rule}</code>
                )}
            </p>
            <GridLayout.Root
                defaultLayout={layout}
                constraints={current?.constraints}
                compactor={compact ? verticalCompactor : noCompactor}
                maxRows={MAX_ROWS}
                rowHeight={32}
                gap={[10, 10]}
                aria-label={`${current?.name} rule`}
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const name = item.id.toUpperCase();
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={`Item ${name}`}
                                className={styles.item}
                            >
                                <span className={styles.title}>{name}</span>
                                <span className={styles.value}>
                                    {item.w} × {item.h}
                                </span>
                                <span className={styles.place}>
                                    x {item.x}, y {item.y}
                                </span>
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize item ${name}`}
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
