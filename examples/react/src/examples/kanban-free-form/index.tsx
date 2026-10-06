"use client";

import {
    GridLayout,
    type GridLayoutRef,
    type Layout,
    noCompactor,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { StickyNote } from "lucide-react";
import { useRef, useState } from "react";
import { describeGesture } from "../_kit/announce";
import { LANES, LaneHeader } from "./lane";
import { type Note, NoteItem, nameOf } from "./note";
import * as styles from "./styles";

/** The board's height in rows: the cells drawn, and how far down a note may go. */
const ROWS = 12;

// The lane headers are statics across the top; the notes start in their lanes.
const layout: Layout = [
    ...LANES.map((lane, index) => ({
        id: lane.id,
        x: index * 4,
        y: 0,
        w: 4,
        h: 1,
        static: true,
    })),
    { id: "note-1", x: 0, y: 1, w: 2, h: 3 },
    { id: "note-2", x: 2, y: 1, w: 2, h: 3 },
    { id: "note-3", x: 0, y: 4, w: 2, h: 3 },
    { id: "note-4", x: 4, y: 1, w: 2, h: 3 },
    { id: "note-5", x: 8, y: 1, w: 2, h: 3 },
];

/** What the notes say at first: the text is the app's, the layout holds only ids and boxes. */
const FIRST: Record<string, Note> = {
    "note-1": { text: "Write the release notes" },
    "note-2": { text: "Ask design about the empty states" },
    "note-3": { text: "Fix the flaky upload test" },
    "note-4": { text: "Migrate the billing page" },
    "note-5": { text: "Ship the onboarding emails" },
};

// A free-form board: nothing settles (`noCompactor`), so a note stays where it is dropped, and
// `preventCollision` refuses a move onto another note instead of pushing it away. The lanes are
// the grid's cells, drawn behind (`GridLayout.Cells`), under static headers. A new note comes from
// the drag source above; each note's text is a textarea, which never starts a drag.
export default function KanbanFreeForm() {
    const gridLayoutRef = useGridLayoutRef();
    const made = useRef(Object.keys(FIRST).length);
    const [notes, setNotes] = useState(FIRST);
    const [message, setMessage] = useState(
        "Drag a new note onto the board, or Tab to it and press Enter.",
    );
    const change = (id: string, note: Note) =>
        setNotes((current) => ({ ...current, [id]: note }));
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 2, h: 3 }}
                    data="note"
                    aria-label="New note"
                    aria-roledescription="draggable"
                    className={styles.source}
                >
                    <StickyNote aria-hidden="true" className={styles.icon} />
                    New note
                </GridLayout.DragSource>
                <p role="status" className={styles.status}>
                    {message}
                </p>
                <Announcer
                    gridLayoutRef={gridLayoutRef}
                    onMessage={setMessage}
                />
            </div>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={layout}
                compactor={noCompactor}
                preventCollision
                maxRows={ROWS}
                rowHeight={36}
                gap={[8, 8]}
                resizable={false}
                createId={() => {
                    made.current += 1;
                    return `note-${made.current}`;
                }}
                aria-label="Board"
                className={styles.root}
            >
                {/* first: drawn under the notes */}
                <GridLayout.Cells rows={ROWS} className={styles.cell} />
                <GridLayout.Items>
                    {(item) =>
                        item.static ? (
                            <LaneHeader key={item.id} id={item.id} />
                        ) : (
                            <NoteItem
                                key={item.id}
                                id={item.id}
                                note={notes[item.id] ?? { text: "" }}
                                onChange={(note) => change(item.id, note)}
                            />
                        )
                    }
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
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

/** Says each step of a gesture, a note coming in from the source included. */
function Announcer({
    gridLayoutRef,
    onMessage,
}: {
    gridLayoutRef: GridLayoutRef;
    onMessage: (message: string) => void;
}) {
    useGridLayoutEvents((event) => {
        const said = describeGesture(
            event,
            event.external ? "New note" : nameOf(event.itemId),
        );
        if (said) onMessage(said);
    }, gridLayoutRef);
    return null;
}
