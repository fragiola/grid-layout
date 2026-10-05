"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useBreakpoint,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { useId, useState } from "react";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { wide: 440, narrow: 0 };
const COLS = { wide: 6, narrow: 2 };

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "uptime", x: 0, y: 2, w: 6, h: 2 },
];

// The breakpoint is the grid's own width's (R1): one page, two grids, two breakpoints at once.
// The panel's width is yours to change; the sidebar stays narrow. A viewport media query would
// give both the same.
export default function ContainerBreakpoints() {
    const [width, setWidth] = useState(500);
    const slider = useId();
    return (
        <div className={styles.frame}>
            <label htmlFor={slider} className={styles.control}>
                Panel width
                <input
                    id={slider}
                    type="range"
                    min={260}
                    max={760}
                    step={20}
                    value={width}
                    onChange={(event) => setWidth(Number(event.target.value))}
                    className={styles.slider}
                />
                <span className={styles.number}>{width}px</span>
            </label>
            <div className={styles.page}>
                <Board label="Panel" width={width} />
                <Board label="Sidebar" width={200} />
            </div>
        </div>
    );
}

/** One grid in a box of `width`, saying its breakpoint. */
function Board({ label, width }: { label: string; width: number }) {
    const gridLayoutRef = useGridLayoutRef();
    return (
        <section aria-label={label} className={styles.board} style={{ width }}>
            <Badge label={label} gridLayoutRef={gridLayoutRef} />
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                defaultLayouts={{ wide: LAYOUT }}
                rowHeight={44}
                gap={[10, 10]}
                aria-label={`${label} dashboard`}
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
        </section>
    );
}

/** A grid's breakpoint, read from outside its root. */
function Badge({
    label,
    gridLayoutRef,
}: {
    label: string;
    gridLayoutRef: GridLayoutRef;
}) {
    const current = useBreakpoint(gridLayoutRef);
    return (
        <p
            className={styles.badge}
            data-testid={`breakpoint-${label.toLowerCase()}`}
        >
            {label}:{" "}
            {current ? `${current.breakpoint}, ${current.cols} columns` : "…"}
        </p>
    );
}
