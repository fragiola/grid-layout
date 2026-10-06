"use client";

import {
    boundedX,
    boundedY,
    containerBounds,
    defaultConstraints,
    GridLayout,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-react";
import { useId, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

const MAX_ROWS = 8;

// Each preset is a stable list (module level): a new list configures the grid again.
const PRESETS: {
    name: string;
    constraints: readonly LayoutConstraint[];
    says: string;
}[] = [
    {
        name: "Default",
        constraints: defaultConstraints,
        says: "Items stay inside the columns and the first 8 rows; B and D keep their own limits.",
    },
    {
        name: "Bounded X",
        constraints: [boundedX, minMaxSize],
        says: "Only the columns bound a move: without compaction, an item goes below row 8.",
    },
    {
        name: "Bounded Y",
        constraints: [boundedY, minMaxSize],
        says: "A move stops at row 8 (the columns are always a hard rule); a resize may grow past it.",
    },
    {
        name: "Container",
        constraints: [containerBounds, minMaxSize],
        says: "Items stay inside the rows the grid shows: its own height, not maxRows.",
    },
    {
        name: "Grid bounds only",
        constraints: [gridBounds],
        says: "No minMaxSize: B and D resize past their own limits.",
    },
    {
        name: "None",
        constraints: [],
        says: "No rule but the columns: items go below row 8 and ignore their limits.",
    },
];

const CONTAINER = 3;

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 2, h: 3, minH: 2, maxH: 4 },
    { id: "e", x: 9, y: 0, w: 3, h: 2 },
    { id: "f", x: 0, y: 2, w: 5, h: 2 },
];

const limits = (item: Layout[number]) =>
    item.minW !== undefined
        ? `width ${item.minW}–${item.maxW}`
        : item.minH !== undefined
          ? `height ${item.minH}–${item.maxH}`
          : undefined;

// The grid's constraints decide where every place and size may go, by pointer, keyboard or
// command. The defaults are gridBounds (the columns and maxRows) then minMaxSize (each item's own
// limits); a preset replaces the list. Compaction runs after the constraints: with vertical
// compaction an item put low still rises, so turn it off to see a position rule alone.
export default function ConstraintPresets() {
    const [preset, setPreset] = useState(0);
    const [compact, setCompact] = useState(false);
    const label = useId();
    const current = PRESETS[preset] ?? PRESETS[0];
    const container = preset === CONTAINER;
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <fieldset aria-label="Constraints" className={styles.segments}>
                    {PRESETS.map((entry, index) => (
                        <Clickable.Button
                            key={entry.name}
                            size="sm"
                            variant={index === preset ? "solid" : "outline"}
                            className={styles.segment(index === preset)}
                            aria-pressed={index === preset}
                            onClick={() => setPreset(index)}
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
                    [{current?.constraints.map((rule) => rule.name).join(", ")}]
                </code>{" "}
                {current?.says}
            </p>
            <GridLayout.Root
                // each preset starts from the same layout: one may have left items where another
                // forbids them
                key={preset}
                defaultLayout={layout}
                constraints={current?.constraints}
                compactor={compact ? verticalCompactor : noCompactor}
                maxRows={MAX_ROWS}
                // containerBounds reads the root's own height: a fixed one, not the layout's
                autoSize={!container}
                rowHeight={40}
                gap={[10, 10]}
                aria-label={`${current?.name} constraints`}
                className={styles.root(container)}
            >
                {/* where maxRows ends, drawn under the items: a picture of the rule, no part */}
                {!container && (
                    <div aria-hidden="true" className={styles.maxRows}>
                        maxRows {MAX_ROWS}
                    </div>
                )}
                <GridLayout.Items>
                    {(item) => {
                        const name = item.id.toUpperCase();
                        const limit = limits(item);
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
                                {limit && (
                                    <span className={styles.place}>
                                        {limit}
                                    </span>
                                )}
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
