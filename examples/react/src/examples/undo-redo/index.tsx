"use client";

import {
    GridLayout,
    type GridLayoutContextValue,
    type GridLayoutRef,
    type Layout,
    useBreakpoint,
    useGridLayout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { Redo2, StickyNote, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { NOTE } from "../_kit/catalogue";
import {
    createUndoHistory,
    type UndoHistory,
    type UndoSnapshot,
    type UndoStep,
    undoKey,
} from "../_kit/undo";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { wide: 480, narrow: 0 };
const COLS = { wide: 12, narrow: 4 };

// only the wide layout is given: the narrow one is generated the first time the grid is narrow
const LAYOUTS: Record<string, Layout> = {
    wide: [
        { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
        { id: "orders", x: 4, y: 0, w: 4, h: 2 },
        { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
        { id: "latency", x: 0, y: 2, w: 6, h: 2 },
        { id: "uptime", x: 6, y: 2, w: 6, h: 2 },
    ],
};

const titleOf = (id: string) =>
    id.startsWith("note-") ? `Note ${id.slice(5)}` : widget(id).title;

const VERBS: Record<string, string> = {
    "item.move": "Move",
    "item.place": "Move",
    "item.resize": "Resize",
    "item.add": "Add",
    "item.remove": "Remove",
    "layouts.generate": "Generate a layout",
};

const describe = (step: UndoStep) =>
    `${VERBS[step.command] ?? step.command}${step.itemId ? ` ${titleOf(step.itemId)}` : ""}`;

// Undo and redo are the app's (D14): `_kit/undo.ts` listens to the model (`model.subscribe`)
// and keeps every breakpoint's layouts from before and after each committed change; undo and
// redo put them back with one `layouts.set`. A drag, a resize, a drop from the sidebar and a
// breakpoint's generated layout are each one step. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes.
export default function UndoRedo() {
    const gridLayoutRef = useGridLayoutRef();
    const [narrow, setNarrow] = useState(false);
    const made = useRef(0);
    return (
        <div className={styles.frame}>
            <Toolbar
                gridLayoutRef={gridLayoutRef}
                narrow={narrow}
                onNarrow={setNarrow}
            />
            <div className={styles.body}>
                <aside className={styles.sidebar} aria-label="New items">
                    <GridLayout.DragSource
                        gridLayoutRef={gridLayoutRef}
                        item={{ w: 3, h: 2 }}
                        aria-label="New note"
                        className={styles.source}
                    >
                        <StickyNote
                            aria-hidden="true"
                            className={styles.icon}
                        />
                        New note
                    </GridLayout.DragSource>
                </aside>
                {/* the grid's width decides its breakpoint: this box is what the toggle narrows */}
                <div className={styles.stage(narrow)}>
                    <GridLayout.Root
                        gridLayoutRef={gridLayoutRef}
                        breakpoints={BREAKPOINTS}
                        cols={COLS}
                        defaultLayouts={LAYOUTS}
                        rowHeight={44}
                        gap={[10, 10]}
                        createId={() => {
                            made.current += 1;
                            return `note-${made.current}`;
                        }}
                        aria-label="Dashboard"
                        className={styles.root}
                    >
                        <GridLayout.Items>
                            {(item) => {
                                const title = titleOf(item.id);
                                return (
                                    <GridLayout.Item
                                        itemId={item.id}
                                        aria-label={title}
                                        className={styles.item}
                                    >
                                        <span className={styles.title}>
                                            {title}
                                        </span>
                                        <span className={styles.place}>
                                            {item.id.startsWith("note-")
                                                ? NOTE
                                                : `x ${item.x} · y ${item.y} · ${item.w} × ${item.h}`}
                                        </span>
                                        <GridLayout.ResizeHandle
                                            side="bottom-end"
                                            aria-label={`Resize ${title}`}
                                            className={styles.resizeHandle}
                                        />
                                    </GridLayout.Item>
                                );
                            }}
                        </GridLayout.Items>
                        <GridLayout.Placeholder
                            className={styles.placeholder}
                        />
                    </GridLayout.Root>
                </div>
            </div>
            <GridLayout.DragPreview
                gridLayoutRef={gridLayoutRef}
                className={styles.preview}
            >
                <StickyNote aria-hidden="true" className={styles.icon} />
                New note
            </GridLayout.DragPreview>
        </div>
    );
}

const EMPTY: UndoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoSteps: [],
    redoSteps: [],
};
const noSubscription = () => () => {};
const emptySnapshot = () => EMPTY;

/** The grid's history: made once its root holds the ref, dropped with it. */
function useUndoHistory(grid: GridLayoutContextValue | null) {
    const [history, setHistory] = useState<UndoHistory>();
    useEffect(() => {
        if (!grid) return undefined;
        const made = createUndoHistory(grid.model);
        setHistory(made);
        return () => {
            made.dispose();
            setHistory(undefined);
        };
    }, [grid]);
    const snapshot = useSyncExternalStore(
        history?.subscribe ?? noSubscription,
        history?.getSnapshot ?? emptySnapshot,
        emptySnapshot,
    );
    return { history, snapshot };
}

/** Undo, redo, the history, and the grid's width. */
function Toolbar({
    gridLayoutRef,
    narrow,
    onNarrow,
}: {
    gridLayoutRef: GridLayoutRef;
    narrow: boolean;
    onNarrow: (narrow: boolean) => void;
}) {
    const grid = useGridLayout(gridLayoutRef);
    const { history, snapshot } = useUndoHistory(grid);
    const current = useBreakpoint(gridLayoutRef);
    // read on every render: the history's changes and the breakpoint's render this toolbar
    const held = grid ? Object.keys(grid.model.get("layouts")).join(", ") : "";

    // the shortcuts, page-wide; never in the middle of a gesture (its preview is not committed)
    useEffect(() => {
        if (!history || !grid) return undefined;
        const onKeyDown = (event: KeyboardEvent) => {
            const action = undoKey(event);
            if (!action || grid.engine.get("gesture")) return;
            event.preventDefault();
            history[action]();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [history, grid]);

    return (
        <div className={styles.toolbar}>
            <div className={styles.buttons}>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    disabled={!snapshot.canUndo}
                    aria-keyshortcuts="Control+Z Meta+Z"
                    onClick={() => history?.undo()}
                >
                    <Undo2 aria-hidden="true" />
                    Undo
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    disabled={!snapshot.canRedo}
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                    onClick={() => history?.redo()}
                >
                    <Redo2 aria-hidden="true" />
                    Redo
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-pressed={narrow}
                    onClick={() => onNarrow(!narrow)}
                >
                    Narrow grid
                </Clickable.Button>
            </div>
            <p className={styles.note}>
                <span data-testid="breakpoint">
                    {current
                        ? `${current.breakpoint}, ${current.cols} columns`
                        : "…"}
                </span>
                {" · layouts held: "}
                <span data-testid="layouts">{held}</span>
            </p>
            <ol aria-label="History" className={styles.history}>
                {snapshot.undoSteps.length + snapshot.redoSteps.length ===
                    0 && (
                    <li className={styles.hint}>
                        Drag, resize, drop a note or narrow the grid: each is a
                        step.
                    </li>
                )}
                {[
                    ...snapshot.undoSteps.map((step) => ({
                        step,
                        undone: false,
                    })),
                    // undone steps after the done ones, the next to redo first
                    ...[...snapshot.redoSteps]
                        .reverse()
                        .map((step) => ({ step, undone: true })),
                ].map(({ step, undone }, index) => (
                    <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: steps in order, never reordered
                        key={index}
                        data-undone={undone ? "" : undefined}
                        className={styles.step}
                    >
                        {describe(step)}
                    </li>
                ))}
            </ol>
        </div>
    );
}
