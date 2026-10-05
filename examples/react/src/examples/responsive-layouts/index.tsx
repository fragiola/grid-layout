"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useBreakpoint,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { Plus, X } from "lucide-react";
import { Clickable } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

// lg and sm are given; md, xs and xxs are generated the first time the grid is that wide, from
// the nearest larger breakpoint's layout (R3), and kept from then on
const LAYOUTS: Record<string, Layout> = {
    lg: dashboard(),
    sm: [
        { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
        { id: "orders", x: 3, y: 0, w: 3, h: 2 },
        { id: "visitors", x: 0, y: 2, w: 6, h: 2 },
        { id: "conversion", x: 0, y: 4, w: 2, h: 2 },
        { id: "latency", x: 2, y: 4, w: 4, h: 2 },
        { id: "uptime", x: 0, y: 6, w: 6, h: 2 },
    ],
};

// The breakpoint is the grid's own width's, never the window's (R1): resize the frame and the
// grid takes the widest breakpoint whose minimum it reaches, with that breakpoint's columns and
// layout. A widget added or removed on one breakpoint is on the others too.
export default function ResponsiveLayouts() {
    const gridLayoutRef = useGridLayoutRef();
    const remove = (id: string) =>
        gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <Current gridLayoutRef={gridLayoutRef} />
                <Add gridLayoutRef={gridLayoutRef} />
            </div>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                defaultLayouts={LAYOUTS}
                rowHeight={52}
                gap={{
                    lg: [12, 12],
                    md: [12, 12],
                    sm: [10, 10],
                    xs: [8, 8],
                    xxs: [8, 8],
                }}
                aria-label="Responsive dashboard"
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
                                <span className={styles.header}>
                                    <span className={styles.title}>
                                        {content.title}
                                    </span>
                                    <Clickable.Button
                                        size="sm"
                                        variant="icon"
                                        aria-label={`Remove ${content.title}`}
                                        onClick={() => remove(item.id)}
                                    >
                                        <X aria-hidden="true" />
                                    </Clickable.Button>
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

/** Adds the first widget the grid does not show, below everything (every breakpoint gets it). */
function Add({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const layout = useGridLayoutView(gridLayoutRef)?.layout ?? [];
    const next = WIDGETS.find(
        (entry) => !layout.some((item) => item.id === entry.id),
    );
    const add = () => {
        if (!next) return;
        gridLayoutRef.current?.model.run("item.add", {
            item: {
                id: next.id,
                x: 0,
                y: Number.POSITIVE_INFINITY,
                w: 2,
                h: 2,
            },
        });
    };
    return (
        <Clickable.Button size="sm" onClick={add} disabled={!next}>
            <Plus aria-hidden="true" />
            Add {next ? next.title : "widget"}
        </Clickable.Button>
    );
}

/** The breakpoint the grid is at, from outside its root. */
function Current({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const current = useBreakpoint(gridLayoutRef);
    return (
        // the breakpoint is said when it changes; the width, changing every pixel, is only shown
        <p className={styles.note}>
            <span aria-live="polite" data-testid="breakpoint">
                {current
                    ? `${current.breakpoint} · ${current.cols} columns`
                    : "Measuring…"}
            </span>
            {current && ` · ${Math.round(current.width)}px`}
        </p>
    );
}
