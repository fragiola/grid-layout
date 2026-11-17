import { NgClass } from "@angular/common";
import { Component, signal } from "@angular/core";
import {
    createGridLayoutRef,
    type DropDetails,
    GRID_LAYOUT,
    injectGridLayoutEvents,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { describeGesture } from "../_kit/announce";
import { CATALOGUE, entryOf, isKind, type WidgetKind } from "../_kit/catalogue";
import * as styles from "./styles";
import { WidgetBody } from "./widget-body";

const START: Layout = [
    { id: "w-1", x: 0, y: 0, w: 3, h: 2 },
    { id: "w-2", x: 3, y: 0, w: 6, h: 3 },
];

let next = 0;

// The sidebar sits outside the grid and reaches it through a `gridLayoutRef`. Each card is a drag
// source with its widget's size; its kind travels as the drop's `data`, and the app keeps which
// kind each id is (the layout holds only ids and boxes). From the keyboard: Tab to a card, Enter
// brings the widget in at the first free cell, the arrows place it, Enter adds it.
@Component({
    selector: "example-widget-sidebar",
    imports: [GRID_LAYOUT, NgClass, ClickableButton, LucideX, WidgetBody],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <aside [class]="styles.sidebar" aria-label="Widgets">
                <p [class]="styles.heading">Widgets</p>
                <!-- [ngClass], not [class]: Angular runs an element's [class] before its inputs,
                     and a source's state needs its gridLayoutRef input -->
                @for (entry of catalogue; track entry.kind) {
                    <div
                        [gridLayoutDragSource]="entry.size"
                        #source="gridLayoutDragSource"
                        [gridLayoutRef]="gridLayoutRef"
                        [data]="entry.kind"
                        [attr.aria-label]="entry.title + ' widget, ' + entry.size.w + ' by ' + entry.size.h"
                        [attr.aria-describedby]="keys"
                        [ngClass]="styles.source(source.state())"
                    >
                        <span [class]="styles.sourceTitle">{{ entry.title }}</span>
                        <span [class]="styles.sourceText">{{ entry.description }}</span>
                    </div>
                }
                <p [id]="keys" [class]="styles.hint">
                    Enter brings a widget in; the arrows place it, Shift and the
                    arrows size it, Enter adds it, Escape leaves it out.
                </p>
                <p role="status" [class]="styles.status">{{ message() }}</p>
            </aside>
            <div
                gridLayoutRoot
                #root="gridLayoutRoot"
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="start"
                [rowHeight]="48"
                [gap]="[12, 12]"
                [createId]="createId"
                (dropped)="onDrop($event)"
                aria-label="Dashboard"
                [class]="styles.root(root.state())"
            >
                <ng-template gridLayoutItems let-item>
                    @let kind = kinds()[item.id] ?? 'notes';
                    @let title = entryOf(kind).title + ' ' + item.id.slice(2);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="title"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.header">
                            <span [class]="styles.title">{{ title }}</span>
                            <button
                                kitClickable
                                size="sm"
                                variant="icon"
                                [attr.aria-label]="'Remove ' + title"
                                (click)="remove(item.id)"
                            >
                                <svg lucideX></svg>
                            </button>
                        </span>
                        <example-widget-body [kind]="kind" />
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize ' + title"
                            [class]="styles.resizeHandle"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
            <div
                *gridLayoutDragPreview="gridLayoutRef; let state"
                [class]="styles.preview(state)"
            >
                {{ titleOf(state.data) }}
            </div>
        </div>
    `,
})
export default class WidgetSidebar {
    protected readonly styles = styles;
    protected readonly catalogue = CATALOGUE;
    protected readonly start = START;
    protected readonly entryOf = entryOf;
    protected readonly keys = `widget-sidebar-keys-${++next}`;
    protected readonly gridLayoutRef = createGridLayoutRef();
    private made = START.length;
    protected readonly kinds = signal<Readonly<Record<string, WidgetKind>>>({
        "w-1": "kpi",
        "w-2": "chart",
    });
    protected readonly message = signal("");

    protected readonly createId = () => {
        this.made += 1;
        return `w-${this.made}`;
    };

    constructor() {
        // says each step, a widget coming in from the sidebar included, from outside the root
        injectGridLayoutEvents((event) => {
            const kind = isKind(event.data)
                ? event.data
                : this.kinds()[event.itemId];
            const name = kind ? entryOf(kind).title : event.itemId;
            const said = describeGesture(event, name);
            if (said) this.message.set(said);
        }, this.gridLayoutRef);
    }

    /** the preview's text: the kind of widget the drop brings */
    protected titleOf(data: unknown) {
        return isKind(data) ? entryOf(data).title : null;
    }

    /** the drop's data is the app's: here, the kind of widget the new id is */
    protected onDrop({ item, data }: DropDetails) {
        if (isKind(data))
            this.kinds.update((all) => ({ ...all, [item.id]: data }));
    }

    protected remove(id: string) {
        this.gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    }
}
