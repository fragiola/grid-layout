"use client";

import {
    GridLayout,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { forget, load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:responsive-persistence";
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

/**
 * Every breakpoint's default layout, the widgets packed in reading order in its columns: given
 * whole, so nothing is generated (and saved) before anyone moves anything.
 */
function defaults(): Record<string, Layout> {
    const ids = dashboard().map((item) => item.id);
    return Object.fromEntries(
        Object.entries(COLS).map(([name, cols]) => {
            const w = Math.min(4, cols);
            const perRow = Math.floor(cols / w);
            return [
                name,
                ids.map((id, index) => ({
                    id,
                    x: (index % perRow) * w,
                    y: Math.floor(index / perRow) * 2,
                    w,
                    h: 2,
                })),
            ];
        }),
    );
}

/** The saved layouts, if the grid can use them: storage holds whatever was written. */
function saved(): Record<string, Layout> | undefined {
    const layouts = load<Record<string, Layout>>(KEY);
    if (!layouts || typeof layouts !== "object") return undefined;
    const usable = Object.entries(layouts).every(
        ([name, layout]) =>
            Object.hasOwn(BREAKPOINTS, name) &&
            layoutProblems(layout).length === 0,
    );
    return usable ? layouts : undefined;
}

// Persistence is the app's (D14): `onLayoutChange` tells every breakpoint's layout with the
// active one, so saving the map keeps each breakpoint as it was left. Every breakpoint's default
// is given, so none is generated (a generated one is told, and would be saved, at once). Reset
// forgets them and starts a new grid from the defaults.
export default function ResponsivePersistence() {
    const [run, setRun] = useState(0);
    // read once: `defaultLayouts` is read when a grid starts
    const [first] = useState(saved);
    const [start, setStart] = useState(() => first ?? defaults());
    const [status, setStatus] = useState(
        first ? "Restored the saved layouts" : "The default layouts",
    );
    const reset = () => {
        forget(KEY);
        setStart(defaults());
        setStatus("Back to the default layouts");
        setRun((count) => count + 1);
    };
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <p className={styles.note} aria-live="polite">
                    {status}
                </p>
                <Clickable.Button size="sm" variant="outline" onClick={reset}>
                    Reset
                </Clickable.Button>
            </div>
            <GridLayout.Root
                key={run}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                defaultLayouts={start}
                onLayoutChange={(_layout, layouts) =>
                    setStatus(
                        save(KEY, layouts)
                            ? `Saved ${Object.keys(layouts).length} layouts`
                            : "Could not save (storage is blocked)",
                    )
                }
                rowHeight={52}
                gap={[12, 12]}
                aria-label="Saved responsive dashboard"
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
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
