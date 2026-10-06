"use client";

import {
    GridLayout,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { forget, load, save } from "../_kit/storage";
import * as styles from "./styles";
import { Widget } from "./widgets";

const KEY = "grid-layout:analytics-dashboard";
const BREAKPOINTS = { lg: 900, md: 600, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 4 };

const KPIS = ["revenue", "orders", "visitors", "conversion"];

/** Every breakpoint's layout, given whole: none is generated (and saved) before a change. */
const DEFAULTS: Record<string, Layout> = {
    lg: [
        ...KPIS.map((id, index) => ({ id, x: index * 3, y: 0, w: 3, h: 3 })),
        { id: "traffic", x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 5 },
        { id: "channels", x: 8, y: 3, w: 4, h: 6, minW: 3, minH: 5 },
        { id: "pages", x: 0, y: 9, w: 12, h: 5, minW: 4, minH: 4 },
    ],
    md: [
        ...KPIS.map((id, index) => ({
            id,
            x: (index % 2) * 4,
            y: Math.floor(index / 2) * 3,
            w: 4,
            h: 3,
        })),
        { id: "traffic", x: 0, y: 6, w: 8, h: 6, minW: 4, minH: 5 },
        { id: "channels", x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 5 },
        { id: "pages", x: 4, y: 12, w: 4, h: 6, minW: 4, minH: 4 },
    ],
    sm: [
        ...KPIS.map((id, index) => ({
            id,
            x: (index % 2) * 2,
            y: Math.floor(index / 2) * 3,
            w: 2,
            h: 3,
        })),
        { id: "traffic", x: 0, y: 6, w: 4, h: 6, minH: 5 },
        { id: "channels", x: 0, y: 12, w: 4, h: 6, minH: 5 },
        { id: "pages", x: 0, y: 18, w: 4, h: 6, minH: 4 },
    ],
};

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

// A store's analytics, as an app would build it: KPI tiles and charts drawn from the app's data,
// each widget moved by the grip in its header (a DragHandle) and resized from its corner. The
// filters in a header are native controls, which never start a drag. Three breakpoints, each
// with its own layout, all saved as they change and restored on the next visit.
export default function AnalyticsDashboard() {
    const [run, setRun] = useState(0);
    // read once: `defaultLayouts` is read when a grid starts
    const [first] = useState(saved);
    const [start, setStart] = useState(() => first ?? DEFAULTS);
    const [status, setStatus] = useState(first ? "Restored your layout" : "");
    const reset = () => {
        forget(KEY);
        setStart(DEFAULTS);
        setStatus("Back to the default layout");
        setRun((count) => count + 1);
    };
    return (
        <div className={styles.frame}>
            <header className={styles.toolbar}>
                <h2 className={styles.heading}>Store analytics</h2>
                <p role="status" className={styles.status}>
                    {status}
                </p>
                <Clickable.Button size="sm" variant="outline" onClick={reset}>
                    Reset layout
                </Clickable.Button>
            </header>
            <GridLayout.Root
                // a new grid on reset: `defaultLayouts` is read once, when a grid starts
                key={run}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                defaultLayouts={start}
                onLayoutChange={(_layout, layouts) =>
                    setStatus(
                        save(KEY, layouts)
                            ? "Layout saved"
                            : "Could not save (storage is blocked)",
                    )
                }
                rowHeight={32}
                gap={[12, 12]}
                aria-label="Store analytics"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => <Widget key={item.id} id={item.id} />}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}
