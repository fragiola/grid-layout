"use client";

import {
    GridLayout,
    horizontalCompactor,
    type Layout,
    type LayoutItem,
    verticalCompactor,
} from "@fragiola/grid-layout-react";
import {
    fastHorizontalCompactor,
    fastVerticalCompactor,
} from "@fragiola/grid-layout-react/compactors";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { seeded } from "../_kit/layouts";
import * as styles from "./styles";
import { type CompactionTimer, createCompactionTimer } from "./timer";

const COUNT = 1000;
const COLS = 48;

/**
 * `count` tiles in bands of two rows, a free row between bands and a few free cells between
 * tiles: no overlap, every gap something for the compactor to close.
 */
function tiles(count: number, seed: number): Layout {
    const random = seeded(seed);
    const items: LayoutItem[] = [];
    let x = 0;
    let band = 0;
    while (items.length < count) {
        const w = 1 + Math.floor(random() * 3);
        x += Math.floor(random() * 3);
        if (x + w > COLS) {
            x = 0;
            band += 1;
            continue;
        }
        const h = 1 + Math.floor(random() * 2);
        items.push({ id: `${items.length + 1}`, x, y: band * 3, w, h });
        x += w;
    }
    return items;
}

const timer = createCompactionTimer();

// Stable compactors (module level): a new object would configure the grid again on each render.
const MODES = [
    { name: "Vertical", compactor: timer.time(verticalCompactor) },
    { name: "Fast vertical", compactor: timer.time(fastVerticalCompactor) },
    { name: "Horizontal", compactor: timer.time(horizontalCompactor) },
    {
        name: "Fast horizontal",
        compactor: timer.time(fastHorizontalCompactor),
    },
];

// A thousand tiles. The standard compactors resolve collisions one by one, which grows fast with
// the number of items; the fast ones (opt-ins, from `/compactors`) settle the same layouts in one
// pass. Pick one: the grid settles again, and every compaction (a switch, a scatter, each step of
// a drag) is timed. Tiles are plain boxes: with this many, what each one renders counts too.
export default function FastCompactors() {
    const [mode, setMode] = useState(1);
    const [seed, setSeed] = useState(11);
    const start = useMemo(() => tiles(COUNT, seed), [seed]);
    const current = MODES[mode] ?? MODES[0];
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <fieldset aria-label="Compactor" className={styles.segments}>
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
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSeed(seed + 1)}
                >
                    Scatter
                </Clickable.Button>
                <LastCompaction timer={timer} />
            </div>
            <GridLayout.Root
                // a new layout to settle: `defaultLayout` is read when a grid starts
                key={seed}
                defaultLayout={start}
                cols={COLS}
                compactor={current?.compactor}
                rowHeight={10}
                gap={[2, 2]}
                padding={[4, 4]}
                aria-label={`${COUNT} tiles`}
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => (
                        <GridLayout.Item
                            itemId={item.id}
                            aria-label={`Tile ${item.id}`}
                            className={styles.item}
                        />
                    )}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

/** The time of the last compaction: it alone renders again when one runs. */
function LastCompaction({ timer }: { timer: CompactionTimer }) {
    const ms = useSyncExternalStore(timer.subscribe, timer.last, timer.last);
    return (
        <span className={styles.timing}>
            Last compaction
            <output aria-label="Last compaction" className={styles.ms}>
                {ms === undefined ? "–" : `${ms.toFixed(1)} ms`}
            </output>
        </span>
    );
}
