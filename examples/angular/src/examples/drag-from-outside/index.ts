import { NgClass } from "@angular/common";
import { Component, signal } from "@angular/core";
import {
    createGridLayoutRef,
    type DropDetails,
    GRID_LAYOUT,
    injectGridLayoutEvents,
} from "@fragiola/grid-layout-angular";
import { LucideStickyNote } from "@lucide/angular";
import { describeGesture } from "../_kit/announce";
import { NOTE } from "../_kit/catalogue";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

const titleOf = (id: string) =>
    id.startsWith("note-") ? `Note ${id.slice(5)}` : widget(id).title;

// One drag source outside the grid, reaching it through a `gridLayoutRef`. Dragged in (or Tab to
// it, Enter, the arrows, Enter), it becomes a new item where it lands: one `item.add`, its id from
// `createId`. What a note says is the app's: the layout holds only ids and boxes.
@Component({
    selector: "example-drag-from-outside",
    imports: [GRID_LAYOUT, NgClass, LucideStickyNote],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <aside [class]="styles.sidebar" aria-label="New items">
                <!-- [ngClass], not [class]: Angular runs an element's [class] before its inputs,
                     and a source's state needs its gridLayoutRef input -->
                <div
                    [gridLayoutDragSource]="{ w: 3, h: 2, minW: 2, minH: 2 }"
                    #source="gridLayoutDragSource"
                    [gridLayoutRef]="gridLayoutRef"
                    data="note"
                    aria-label="New note"
                    aria-roledescription="draggable"
                    [ngClass]="styles.source(source.state())"
                >
                    <svg lucideStickyNote [class]="styles.icon"></svg>
                    New note
                </div>
                <p role="status" [class]="styles.status">{{ message() }}</p>
                @if (last()) {
                    <p [class]="styles.last">{{ last() }}</p>
                }
            </aside>
            <div
                gridLayoutRoot
                #root="gridLayoutRoot"
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                [createId]="createId"
                (dropped)="onDrop($event)"
                aria-label="Dashboard"
                [class]="styles.root(root.state())"
            >
                <ng-template gridLayoutItems let-item>
                    @let note = item.id.startsWith('note-');
                    @let title = titleOf(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="title"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ title }}</span>
                        <span [class]="styles.body">{{ note ? noteText : widget(item.id).value }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
            <!-- what follows the pointer is the app's: here a small card -->
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
export default class DragFromOutside {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly titleOf = titleOf;
    protected readonly noteText = NOTE;
    protected readonly gridLayoutRef = createGridLayoutRef();
    private made = 0;
    protected readonly message = signal(
        "Drag the note into the grid, or Tab to it and press Enter.",
    );
    protected readonly last = signal("");

    protected readonly createId = () => {
        this.made += 1;
        return `note-${this.made}`;
    };

    constructor() {
        // says each step of a gesture, the drop's included, from outside the root
        injectGridLayoutEvents((event) => {
            const name = event.external ? "Note" : titleOf(event.itemId);
            const said = describeGesture(event, name);
            if (said) this.message.set(said);
        }, this.gridLayoutRef);
    }

    /** the drop, told once it is in the layout: here, the cell it took */
    protected onDrop({ item }: DropDetails) {
        this.last.set(`Last drop: column ${item.x + 1}, row ${item.y + 1}`);
    }
}
