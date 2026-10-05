"use client";

import {
    GridLayout,
    type GridLayoutRef,
    useGridLayoutEvents,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { StickyNote } from "lucide-react";
import { useRef, useState } from "react";
import { describeGesture } from "../_kit/announce";
import { NOTE } from "../_kit/catalogue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

// One drag source outside the grid, reaching it through a `gridLayoutRef`. Dragged in (or Tab to
// it, Enter, the arrows, Enter), it becomes a new item where it lands: one `item.add`, its id from
// `createId`. What a note says is the app's: the layout holds only ids and boxes.
export default function DragFromOutside() {
    const gridLayoutRef = useGridLayoutRef();
    const made = useRef(0);
    const [message, setMessage] = useState(
        "Drag the note into the grid, or Tab to it and press Enter.",
    );
    const [last, setLast] = useState("");
    return (
        <div className={styles.frame}>
            <aside className={styles.sidebar} aria-label="New items">
                <GridLayout.DragSource
                    gridLayoutRef={gridLayoutRef}
                    item={{ w: 3, h: 2, minW: 2, minH: 2 }}
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
                {last && <p className={styles.last}>{last}</p>}
                <Announcer
                    gridLayoutRef={gridLayoutRef}
                    onMessage={setMessage}
                />
            </aside>
            <GridLayout.Root
                gridLayoutRef={gridLayoutRef}
                defaultLayout={layout}
                rowHeight={56}
                gap={[12, 12]}
                createId={() => {
                    made.current += 1;
                    return `note-${made.current}`;
                }}
                // the drop, told once it is in the layout: here, the cell it took
                onDrop={({ item }) =>
                    setLast(
                        `Last drop: column ${item.x + 1}, row ${item.y + 1}`,
                    )
                }
                aria-label="Dashboard"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        const note = item.id.startsWith("note-");
                        const title = note
                            ? `Note ${item.id.slice(5)}`
                            : widget(item.id).title;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                aria-label={title}
                                className={styles.item}
                            >
                                <span className={styles.title}>{title}</span>
                                <span className={styles.body}>
                                    {note ? NOTE : widget(item.id).value}
                                </span>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
            {/* what follows the pointer is the app's: here a small card */}
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

/** Says each step of a gesture, the drop's included, from outside the root. */
function Announcer({
    gridLayoutRef,
    onMessage,
}: {
    gridLayoutRef: GridLayoutRef;
    onMessage: (message: string) => void;
}) {
    useGridLayoutEvents((event) => {
        const name = event.external
            ? "Note"
            : event.itemId.startsWith("note-")
              ? `Note ${event.itemId.slice(5)}`
              : widget(event.itemId).title;
        const said = describeGesture(event, name);
        if (said) onMessage(said);
    }, gridLayoutRef);
    return null;
}
