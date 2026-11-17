import { Component, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectGridLayoutEvents,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-angular";
import { LucideStickyNote } from "@lucide/angular";
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
// the grid's cells, drawn behind (`*gridLayoutCells`), under static headers. A new note comes from
// the drag source above; each note's text is a textarea, which never starts a drag.
@Component({
    selector: "example-kanban-free-form",
    imports: [GRID_LAYOUT, LucideStickyNote, LaneHeader, NoteItem],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <div
                    [gridLayoutDragSource]="{ w: 2, h: 3 }"
                    #source="gridLayoutDragSource"
                    [gridLayoutRef]="gridLayoutRef"
                    data="note"
                    aria-label="New note"
                    aria-roledescription="draggable"
                    [class]="styles.source(source.state())"
                >
                    <svg lucideStickyNote [class]="styles.icon"></svg>
                    New note
                </div>
                <p role="status" [class]="styles.status">{{ message() }}</p>
            </div>
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="layout"
                [compactor]="noCompactor"
                preventCollision
                [maxRows]="rows"
                [rowHeight]="36"
                [gap]="[8, 8]"
                [resizable]="false"
                [createId]="createId"
                aria-label="Board"
                [class]="styles.root"
            >
                <!-- first: drawn under the notes -->
                <div *gridLayoutCells="let cell; rows: rows" [class]="styles.cell(cell)"></div>
                <ng-template gridLayoutItems let-item>
                    @if (item.static) {
                        <kanban-lane-header [id]="item.id" />
                    } @else {
                        <kanban-note
                            [id]="item.id"
                            [note]="notes()[item.id] ?? empty"
                            (noteChange)="change(item.id, $event)"
                        />
                    }
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
            <div
                *gridLayoutDragPreview="gridLayoutRef; let state"
                [class]="styles.preview(state)"
            >
                <svg lucideStickyNote [class]="styles.icon"></svg>
                New note
            </div>
        </div>
    `,
})
export default class KanbanFreeForm {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly rows = ROWS;
    protected readonly noCompactor = noCompactor;
    protected readonly empty: Note = { text: "" };

    protected readonly gridLayoutRef = createGridLayoutRef();
    private made = Object.keys(FIRST).length;
    protected readonly notes = signal(FIRST);
    protected readonly message = signal(
        "Drag a new note onto the board, or Tab to it and press Enter.",
    );

    protected readonly createId = () => {
        this.made += 1;
        return `note-${this.made}`;
    };

    constructor() {
        // says each step of a gesture, a note coming in from the source included
        injectGridLayoutEvents((event) => {
            const said = describeGesture(
                event,
                event.external ? "New note" : nameOf(event.itemId),
            );
            if (said) this.message.set(said);
        }, this.gridLayoutRef);
    }

    protected change(id: string, note: Note) {
        this.notes.update((current) => ({ ...current, [id]: note }));
    }
}
