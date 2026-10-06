"use client";

import {
    type CommandEvent,
    type GestureEvent,
    GridLayout,
    type GridLayoutRef,
    type LayoutItem,
    useGridLayout,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { Eraser } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { dashboard } from "../_kit/layouts";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

/** A line of the log: a command the model committed, or a gesture's step. */
interface Entry {
    readonly kind: "command" | "gesture";
    readonly name: string;
    readonly detail: string;
}

/** What to log. */
interface Filters {
    readonly commands: boolean;
    readonly gestures: boolean;
    /** the steps in between (`drag`, `resize`, `move`, `drop-over`): many per gesture */
    readonly steps: boolean;
}

const FILTERS: { key: keyof Filters; label: string }[] = [
    { key: "commands", label: "Commands" },
    { key: "gestures", label: "Gestures" },
    { key: "steps", label: "Every step" },
];

/** The lines kept: the oldest go first. */
const LIMIT = 60;

const STEPS = new Set(["drag", "resize", "move", "drop-over"]);

const box = (item: Pick<LayoutItem, "x" | "y" | "w" | "h">) =>
    `x ${item.x}, y ${item.y}, ${item.w} × ${item.h}`;

/** A command in words: the item it named and where it settled, when it names one. */
function describeCommand(event: CommandEvent): Entry {
    const result = event.result as { item?: LayoutItem; itemId?: string };
    const detail = result.item
        ? `${widget(result.item.id).title} at ${box(result.item)}`
        : result.itemId
          ? widget(result.itemId).title
          : `breakpoint ${event.after.breakpoint}, ${event.after.layouts[event.after.breakpoint]?.length ?? 0} items`;
    return { kind: "command", name: event.command, detail };
}

/** A gesture's step in words: who, by what, and where it is now. */
function describeEvent(event: GestureEvent): Entry {
    const where = event.outside ? "off the grid" : `at ${box(event.item)}`;
    return {
        kind: "gesture",
        name: event.type,
        detail: `${widget(event.itemId).title} (${event.source}) ${where}`,
    };
}

// Two streams, read from outside the root through a `gridLayoutRef`: `model.subscribe` tells
// every committed command with the state before and after it, whoever ran it; the engine's events
// (`useGridLayoutEvents`) tell every step of a pointer or keyboard gesture. A drag is a
// `drag-start`, its `drag` steps, a `drag-stop`, and one `item.move` between the last two.
export default function EventLog() {
    const gridLayoutRef = useGridLayoutRef();
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={layout}
                rowHeight={48}
                gap={[10, 10]}
                aria-label="Dashboard"
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
            <Log gridLayoutRef={gridLayoutRef} />
        </div>
    );
}

/** The log panel: its filters, and the newest lines first. */
function Log({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const [lines, setLines] = useState<readonly LogLine<Entry>[]>([]);
    const [filters, setFilters] = useState<Filters>({
        commands: true,
        gestures: true,
        steps: false,
    });
    // the listeners below read the filters as they are when an event comes
    const latest = useRef(filters);
    latest.current = filters;
    const id = useId();
    const add = (entry: Entry) => setLines((log) => prepend(log, entry, LIMIT));

    const grid = useGridLayout(gridLayoutRef);
    useEffect(
        () =>
            grid?.model.subscribe((event) => {
                if (latest.current.commands)
                    setLines((log) =>
                        prepend(log, describeCommand(event), LIMIT),
                    );
            }),
        [grid],
    );
    useGridLayoutEvents((event) => {
        const { gestures, steps } = latest.current;
        if (STEPS.has(event.type) ? steps : gestures) add(describeEvent(event));
    }, gridLayoutRef);

    return (
        <section aria-labelledby={`${id}-title`} className={styles.panel}>
            <div className={styles.panelHead}>
                <h2 id={`${id}-title`} className={styles.panelTitle}>
                    Events
                </h2>
                <Clickable.Button
                    size="sm"
                    variant="icon"
                    shape="square"
                    aria-label="Clear the log"
                    onClick={() => setLines([])}
                >
                    <Eraser aria-hidden="true" />
                </Clickable.Button>
            </div>
            <div className={styles.filters}>
                {FILTERS.map(({ key, label }) => (
                    <span key={key} className={styles.filter}>
                        <Switch.Root
                            aria-labelledby={`${id}-${key}`}
                            checked={filters[key]}
                            onCheckedChange={(checked) =>
                                setFilters({ ...filters, [key]: checked })
                            }
                        >
                            <Switch.Thumb />
                        </Switch.Root>
                        <span id={`${id}-${key}`}>{label}</span>
                    </span>
                ))}
            </div>
            <ol role="log" aria-label="Events" className={styles.log}>
                {lines.length === 0 && (
                    <li className={styles.empty}>
                        Drag or resize a widget, or Tab to one and press Space.
                    </li>
                )}
                {lines.map(({ key, entry }) => (
                    <li key={key} className={styles.line}>
                        <span className={styles.kind(entry.kind)}>
                            {entry.kind}
                        </span>
                        <code className={styles.name}>{entry.name}</code>
                        <span className={styles.detail}>{entry.detail}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
