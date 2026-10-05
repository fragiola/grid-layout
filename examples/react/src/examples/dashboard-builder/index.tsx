"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    layoutProblems,
    useGridLayoutEvents,
    useGridLayoutRef,
    useGridLayoutView,
} from "@fragiola/grid-layout-react";
import { Trash2, X } from "lucide-react";
import { type RefObject, useRef, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import {
    CATALOGUE,
    entryOf,
    freeId,
    isKind,
    kindOfId,
} from "../_kit/catalogue";
import { pointerOver } from "../_kit/hit";
import { forget, load, save } from "../_kit/storage";
import * as styles from "./styles";
import { WidgetBody } from "./widget-body";

const KEY = "grid-layout:dashboard-builder";

const STARTER: Layout = [
    { id: "kpi-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "chart-1", x: 3, y: 0, w: 6, h: 3 },
    { id: "notes-1", x: 9, y: 0, w: 3, h: 3 },
];

/** An item's name: its kind and its number, from its id (`chart-3` is "Chart 3"). */
function nameOf(id: string): string {
    const kind = kindOfId(id);
    return kind ? `${entryOf(kind).title} ${id.slice(kind.length + 1)}` : id;
}

/** The saved dashboard, if the grid can use it: storage holds whatever was written. */
function saved(): Layout | undefined {
    const layout = load<Layout>(KEY);
    return layout && layoutProblems(layout).length === 0 ? layout : undefined;
}

// Everything together, as an app would: the sidebar's widgets are drag sources outside the grid
// (through a `gridLayoutRef`), each new id says its kind (`chart-3`, the app's ids); a widget
// released over the trash is removed (`onDragStop` reports `outside` and the element under the
// pointer); every committed change is saved; Reset starts again from the starter dashboard.
export default function DashboardBuilder() {
    const gridLayoutRef = useGridLayoutRef();
    const trash = useRef<HTMLDivElement>(null);
    const [run, setRun] = useState(0);
    // read once per grid: `defaultLayout` is read when a grid starts
    const [start, setStart] = useState(() => saved() ?? STARTER);
    const [message, setMessage] = useState("");
    const remove = (id: string) =>
        gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    const reset = () => {
        forget(KEY);
        setStart(STARTER);
        setRun((count) => count + 1);
        setMessage("Back to the starter dashboard.");
    };
    return (
        <div className={styles.frame}>
            <aside className={styles.sidebar} aria-label="Widgets">
                <p className={styles.heading}>Widgets</p>
                <Sources gridLayoutRef={gridLayoutRef} />
                <Trash gridLayoutRef={gridLayoutRef} trash={trash} />
                <Clickable.Button size="sm" variant="outline" onClick={reset}>
                    Reset
                </Clickable.Button>
                <p role="status" className={styles.status}>
                    {message}
                </p>
                <Announcer
                    gridLayoutRef={gridLayoutRef}
                    onMessage={setMessage}
                />
            </aside>
            <GridLayout.Root
                // a new grid on reset: `defaultLayout` is read once, when a grid starts
                key={run}
                gridLayoutRef={gridLayoutRef}
                defaultLayout={start}
                rowHeight={44}
                gap={[12, 12]}
                onLayoutChange={(layout) => save(KEY, layout)}
                onDragStop={(event) => {
                    const target = event.target;
                    if (
                        event.outside &&
                        target &&
                        trash.current?.contains(target)
                    )
                        remove(event.itemId);
                }}
                aria-label="Your dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const kind = kindOfId(item.id) ?? "notes";
                        const title = nameOf(item.id);
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

/** The sidebar's widgets: drag sources outside the grid, each naming its new item's id. */
function Sources({ gridLayoutRef }: { gridLayoutRef: GridLayoutRef }) {
    const layout = useGridLayoutView(gridLayoutRef)?.layout ?? [];
    return CATALOGUE.map((entry) => (
        <GridLayout.DragSource
            key={entry.kind}
            gridLayoutRef={gridLayoutRef}
            // the id says the kind: the layout alone rebuilds the dashboard
            itemId={freeId(layout, entry.kind)}
            item={entry.size}
            data={entry.kind}
            aria-label={`${entry.title} widget`}
            className={styles.source}
        >
            <span className={styles.sourceTitle}>{entry.title}</span>
            <span className={styles.sourceText}>{entry.description}</span>
        </GridLayout.DragSource>
    ));
}

/** Where a widget goes to be removed: open while one is held off the grid. */
function Trash({
    gridLayoutRef,
    trash,
}: {
    gridLayoutRef: GridLayoutRef;
    trash: RefObject<HTMLDivElement | null>;
}) {
    const open = useHeldOver(gridLayoutRef, trash);
    return (
        <div
            ref={trash}
            data-open={open ? "" : undefined}
            className={styles.trash}
        >
            <Trash2 aria-hidden="true" className={styles.icon} />
            Drop here to remove
        </div>
    );
}

/**
 * Whether a widget held off the grid is over `target` now: the pointer is the grid's while it
 * holds a widget, so the drag's own events say where it is.
 */
function useHeldOver(
    gridLayoutRef: GridLayoutRef,
    target: RefObject<HTMLElement | null>,
): boolean {
    const [over, setOver] = useState(false);
    useGridLayoutEvents((event) => {
        setOver(
            event.type === "drag" &&
                event.outside &&
                pointerOver(target.current, event.nativeEvent),
        );
    }, gridLayoutRef);
    return over;
}

/** Says each step, a widget coming in from the sidebar included. */
function Announcer({
    gridLayoutRef,
    onMessage,
}: {
    gridLayoutRef: GridLayoutRef;
    onMessage: (message: string) => void;
}) {
    useGridLayoutEvents((event) => {
        // a widget coming in has no number yet: its kind says what it is
        const name =
            event.external && isKind(event.data)
                ? entryOf(event.data).title
                : nameOf(event.itemId);
        const said = describeGesture(event, name);
        if (said) onMessage(said);
    }, gridLayoutRef);
    return null;
}
