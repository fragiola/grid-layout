"use client";

import {
    type CommandContext,
    GridLayout,
    type GridRect,
    itemPixels,
    type Layout,
    noCompactor,
    type PlaceResult,
    useGridLayout,
    useGridLayoutEvents,
    useGridLayoutView,
    veto,
} from "@fragiola/grid-layout-react";
import { useEffect, useRef, useState } from "react";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

/** The reserved area, in grid units: no item may end up there. */
const RESERVED: GridRect = { x: 8, y: 0, w: 4, h: 3 };

/** The most widgets one row may hold. */
const PER_ROW = 3;

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 2, h: 2 },
    { id: "latency", x: 2, y: 2, w: 6, h: 2 },
    { id: "uptime", x: 0, y: 4, w: 12, h: 2 },
];

/** A command that places or sizes an item: the rules read the layout it settles into. */
type Placing = Extract<
    CommandContext,
    { command: "item.move" | "item.place" | "item.resize" | "item.add" }
>;

const placing = (ctx: CommandContext): ctx is Placing =>
    ctx.command === "item.move" ||
    ctx.command === "item.place" ||
    ctx.command === "item.resize" ||
    ctx.command === "item.add";

/** A refusal: which item, where it was asked to go, and why not. */
interface Refusal {
    readonly itemId: string;
    readonly where: string;
    readonly reason: string;
}

const overlapsReserved = (box: GridRect) =>
    box.x < RESERVED.x + RESERVED.w &&
    box.x + box.w > RESERVED.x &&
    box.y < RESERVED.y + RESERVED.h &&
    box.y + box.h > RESERVED.y;

/** The item a command names, and where it asks it to go (or what size), in words. */
function attempt(ctx: Placing): { itemId: string; where: string } {
    const cell = (x: number, y: number) => `to column ${x + 1}, row ${y + 1}`;
    switch (ctx.command) {
        case "item.add": {
            const { item } = ctx.payload;
            return {
                itemId: item.id,
                where: item.x === undefined ? "" : cell(item.x, item.y ?? 0),
            };
        }
        case "item.resize":
            return {
                itemId: ctx.payload.itemId,
                where: `to ${ctx.payload.w} × ${ctx.payload.h}`,
            };
        default:
            return {
                itemId: ctx.payload.itemId,
                where: cell(ctx.payload.x, ctx.payload.y),
            };
    }
}

/** Why a settled layout breaks a rule, or `undefined` when it keeps them all. */
function broken(layout: Layout): string | undefined {
    const inside = layout.find(overlapsReserved);
    if (inside)
        return `${widget(inside.id).title} would enter the reserved area.`;
    const rows = Math.max(0, ...layout.map((item) => item.y + item.h));
    for (let row = 0; row < rows; row++) {
        const count = layout.filter(
            (item) => item.y <= row && row < item.y + item.h,
        ).length;
        if (count > PER_ROW)
            return `Row ${row + 1} would hold ${count} widgets; ${PER_ROW} at most.`;
    }
    return undefined;
}

// Two app rules as middleware (`model.use`): the reserved area stays empty, and a row holds three
// widgets at most. Each runs the command first (`next()`), reads the layout it would settle into
// (pushes included) and vetoes it when a rule breaks. A drag asks the model at every cell (a dry
// run through the same middleware), so a refused landing shows the item going back, and the drop
// changes nothing; the log below says why. From the keyboard, a refused step is simply not taken.
// Free placement (`noCompactor`): nothing floats up into the reserved area on its own.
export default function Middleware() {
    const [log, setLog] = useState<readonly LogLine<Refusal>[]>([]);
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={LAYOUT}
                compactor={noCompactor}
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Dashboard with rules"
                className={styles.root}
            >
                <Rules
                    onRefused={(refusal) =>
                        setLog((lines) => prepend(lines, refusal, 20))
                    }
                />
                <Reserved />
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
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${content.title}`}
                                    className={styles.resizeHandle}
                                />
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
            <section aria-labelledby="refused-title" className={styles.panel}>
                <h2 id="refused-title" className={styles.panelTitle}>
                    Refused moves
                </h2>
                <ol
                    role="log"
                    aria-label="Refused moves"
                    className={styles.log}
                >
                    {log.length === 0 && (
                        <li className={styles.empty}>
                            Drag a widget into the reserved area, or a fourth
                            one onto the first row.
                        </li>
                    )}
                    {log.map(({ key, entry }) => (
                        <li key={key} className={styles.line}>
                            <span className={styles.lineHead}>
                                {widget(entry.itemId).title} {entry.where}
                            </span>
                            {entry.reason}
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}

/**
 * The rules, inside the root: a middleware that vetoes, and the gesture events that tell when a
 * pointer released an item where the rules said no. Renders nothing.
 */
function Rules({ onRefused }: { onRefused: (refusal: Refusal) => void }) {
    const { model } = useGridLayout();
    /** the last refusal the middleware gave: the log reads it when the gesture ends */
    const last = useRef<Refusal | undefined>(undefined);

    useEffect(
        () =>
            model.use((ctx, next) => {
                if (!placing(ctx)) return next();
                const result = next();
                if (!result.ok) return result;
                // every placing command returns the layout it settles into
                const reason = broken((result.value as PlaceResult).layout);
                if (!reason) return result;
                last.current = { ...attempt(ctx), reason };
                return veto(reason);
            }),
        [model],
    );

    useGridLayoutEvents((event) => {
        // a pointer released where the rules said no: the item went back, no command ran
        if (
            (event.type === "drag-stop" || event.type === "resize-stop") &&
            event.refused &&
            !event.outside &&
            last.current
        ) {
            onRefused(last.current);
        }
    });
    return null;
}

/** The reserved area, drawn under the items where the grid places a box of its size. */
function Reserved() {
    const { geometry } = useGridLayoutView();
    if (!geometry) return null;
    const box = itemPixels(geometry, RESERVED);
    return (
        <div
            aria-hidden="true"
            className={styles.reserved}
            // the box is the grid's geometry: logical, from the inline-start edge
            style={{
                insetInlineStart: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
            }}
        >
            Reserved
        </div>
    );
}
