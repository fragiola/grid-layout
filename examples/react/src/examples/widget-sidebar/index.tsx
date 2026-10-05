"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import { CATALOGUE, entryOf, isKind, type WidgetKind } from "../_kit/catalogue";
import * as styles from "./styles";
import { WidgetBody } from "./widget-body";

const START: Layout = [
    { id: "w-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "w-2", x: 3, y: 0, w: 6, h: 3 },
];

// The sidebar sits outside the grid and reaches it through a `gridLayoutRef`. Each card is a drag
// source with its widget's size; its kind travels as the drop's `data`, and the app keeps which
// kind each id is (the layout holds only ids and boxes). From the keyboard: Tab to a card, Enter
// brings the widget in at the first free cell, the arrows place it, Enter adds it.
export default function WidgetSidebar() {
    const gridLayoutRef = useGridLayoutRef();
    const keys = useId();
    const made = useRef(START.length);
    const [kinds, setKinds] = useState<Record<string, WidgetKind>>({
        "w-1": "kpi",
        "w-2": "chart",
    });
    const [message, setMessage] = useState("");
    const remove = (id: string) =>
        gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    return (
        <div className={styles.frame}>
            <aside className={styles.sidebar} aria-label="Widgets">
                <p className={styles.heading}>Widgets</p>
                {CATALOGUE.map((entry) => (
                    <GridLayout.DragSource
                        key={entry.kind}
                        gridLayoutRef={gridLayoutRef}
                        item={entry.size}
                        data={entry.kind}
                        aria-label={`${entry.title} widget, ${entry.size.w} by ${entry.size.h}`}
                        aria-describedby={keys}
                        className={styles.source}
                    >
                        <span className={styles.sourceTitle}>
                            {entry.title}
                        </span>
                        <span className={styles.sourceText}>
                            {entry.description}
                        </span>
                    </GridLayout.DragSource>
                ))}
                <p id={keys} className={styles.hint}>
                    Enter brings a widget in; the arrows place it, Shift and the
                    arrows size it, Enter adds it, Escape leaves it out.
                </p>
                <p role="status" className={styles.status}>
                    {message}
                </p>
                <Announcer
                    gridLayoutRef={gridLayoutRef}
                    kinds={kinds}
                    onMessage={setMessage}
                />
            </aside>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={START}
                rowHeight={48}
                gap={[12, 12]}
                createId={() => {
                    made.current += 1;
                    return `w-${made.current}`;
                }}
                // the drop's data is the app's: here, the kind of widget the new id is
                onDrop={({ item, data }) => {
                    if (isKind(data))
                        setKinds((all) => ({ ...all, [item.id]: data }));
                }}
                aria-label="Dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const kind = kinds[item.id] ?? "notes";
                        const title = `${entryOf(kind).title} ${item.id.slice(2)}`;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={title}
                                className={styles.item}
                            >
                                <span className={styles.header}>
                                    <span className={styles.title}>
                                        {title}
                                    </span>
                                    <Clickable.Button
                                        size="sm"
                                        variant="icon"
                                        aria-label={`Remove ${title}`}
                                        onClick={() => remove(item.id)}
                                    >
                                        <X aria-hidden="true" />
                                    </Clickable.Button>
                                </span>
                                <WidgetBody kind={kind} />
                                <GridLayout.ResizeHandle
                                    side="bottom-end"
                                    aria-label={`Resize ${title}`}
                                    className={styles.resizeHandle}
                                />
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
            <GridLayout.DragPreview
                gridLayoutRef={gridLayoutRef}
                className={styles.preview}
            >
                {(state) =>
                    isKind(state.data) ? entryOf(state.data).title : null
                }
            </GridLayout.DragPreview>
        </div>
    );
}

/** Says each step, a widget coming in from the sidebar included, from outside the root. */
function Announcer({
    gridLayoutRef,
    kinds,
    onMessage,
}: {
    gridLayoutRef: GridLayoutRef;
    kinds: Record<string, WidgetKind>;
    onMessage: (message: string) => void;
}) {
    useGridLayoutEvents((event) => {
        const kind = isKind(event.data) ? event.data : kinds[event.itemId];
        const name = kind ? entryOf(kind).title : event.itemId;
        const said = describeGesture(event, name);
        if (said) onMessage(said);
    }, gridLayoutRef);
    return null;
}
