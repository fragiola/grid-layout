"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayout,
    useGridLayoutRef,
    useGridLayoutView,
    veto,
} from "@fragiola/grid-layout-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import * as styles from "./styles";

/** The columns nothing may be dropped into: the last three. */
const LOCKED_FROM = 9;

const SOURCES = [
    { kind: "kpi", title: "KPI", rule: "anywhere free", w: 3, h: 2 },
    { kind: "clock", title: "Clock", rule: "one at most", w: 3, h: 2 },
    { kind: "banner", title: "Banner", rule: "shrinks to fit", w: 9, h: 1 },
] as const;

const START: Layout = [{ id: "kpi-0", x: 0, y: 0, w: 3, h: 2 }];

// Every drop is one `item.add` through the model's middleware, and the preview is its dry run:
// what the rules refuse shows refused (`data-drop-refused`, no placeholder), what they rewrite
// shows rewritten. Each source names its new item's id (`clock-2`), so the rules can tell kinds
// apart; the reason a rule gives is the app's to show.
export default function DropRules() {
    const gridLayoutRef = useGridLayoutRef();
    const reason = useRef("");
    const [made, setMade] = useState(1);
    return (
        <div className={styles.frame}>
            <aside className={styles.sidebar} aria-label="Widgets">
                {SOURCES.map((source) => (
                    <GridLayout.DragSource
                        key={source.kind}
                        gridLayoutRef={gridLayoutRef}
                        itemId={`${source.kind}-${made}`}
                        item={{ w: source.w, h: source.h, minW: 3 }}
                        aria-label={`${source.title}, ${source.rule}`}
                        className={styles.source}
                    >
                        <span className={styles.sourceTitle}>
                            {source.title}
                        </span>
                        <span className={styles.sourceText}>{source.rule}</span>
                    </GridLayout.DragSource>
                ))}
                <Verdict gridLayoutRef={gridLayoutRef} reason={reason} />
            </aside>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={START}
                rowHeight={48}
                gap={[12, 12]}
                onDrop={() => setMade((count) => count + 1)}
                aria-label="Dashboard with rules"
                className={styles.root}
            >
                <Rules reason={reason} />
                {/* the locked columns, drawn under the items: a picture of the rule, no part */}
                <div aria-hidden="true" className={styles.locked}>
                    Locked
                </div>
                <GridLayout.Items>
                    {(item) => {
                        const title = item.id.replace("-", " ");
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={title}
                                className={styles.item}
                            >
                                {title}
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

/** The rules, as middleware on `item.add`: they run for the preview's dry run and the drop. */
function Rules({ reason }: { reason: RefObject<string> }) {
    const { model } = useGridLayout();
    useEffect(
        () =>
            model.use((ctx, next) => {
                if (ctx.command !== "item.add") return next();
                const { item } = ctx.payload;
                const x = item.x ?? 0;
                const layout = ctx.state.layouts[ctx.state.breakpoint] ?? [];
                if (
                    item.id.startsWith("clock") &&
                    layout.some((entry) => entry.id.startsWith("clock"))
                ) {
                    reason.current = "One clock at most.";
                    return veto(reason.current);
                }
                // a banner shrinks to end where the locked columns start, never below its minimum
                if (item.id.startsWith("banner") && x + item.w > LOCKED_FROM) {
                    const fit = LOCKED_FROM - x;
                    if (fit >= (item.minW ?? 1))
                        ctx.payload = { item: { ...item, w: fit } };
                }
                if (x + ctx.payload.item.w > LOCKED_FROM) {
                    reason.current = "The last three columns are locked.";
                    return veto(reason.current);
                }
                return next();
            }),
        [model, reason],
    );
    return null;
}

/** What the rules say about the drop in progress. */
function Verdict({
    gridLayoutRef,
    reason,
}: {
    gridLayoutRef: GridLayoutRef;
    reason: RefObject<string>;
}) {
    const view = useGridLayoutView(gridLayoutRef);
    const dropping = view?.gesture?.kind === "drop" && !view.gesture.outside;
    const said = view?.dropRefused
        ? reason.current
        : dropping
          ? "Allowed here."
          : "Drag a widget onto the grid.";
    return (
        <p role="status" className={styles.verdict}>
            {said}
        </p>
    );
}
