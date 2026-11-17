import { Component, inject, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { LucideStickyNote } from "@lucide/angular";
import { NOTE } from "../_kit/catalogue";
import { GRID } from "./grid";
import * as styles from "./styles";
import { titleOf } from "./titles";
import { Toolbar } from "./toolbar";

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

// Undo and redo are the app's (D14): `_kit/undo.ts` listens to the model (`model.subscribe`)
// and keeps every breakpoint's layouts from before and after each committed change; undo and
// redo put them back with one `layouts.set`. A drag, a resize, a drop from the sidebar and a
// breakpoint's generated layout are each one step. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes.
@Component({
    selector: "example-undo-redo",
    imports: [GRID_LAYOUT, LucideStickyNote, Toolbar],
    // one ref per example on the page, shared with the toolbar through injection
    providers: [{ provide: GRID, useFactory: createGridLayoutRef }],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-undo-redo-toolbar [(narrow)]="narrow" />
            <div [class]="styles.body">
                <aside [class]="styles.sidebar" aria-label="New items">
                    <div
                        [gridLayoutDragSource]="{ w: 3, h: 2 }"
                        [gridLayoutRef]="gridLayoutRef"
                        #source="gridLayoutDragSource"
                        aria-label="New note"
                        [class]="styles.source(source.state())"
                    >
                        <svg lucideStickyNote [class]="styles.icon"></svg>
                        New note
                    </div>
                </aside>
                <!-- the grid's width decides its breakpoint: this box is what the toggle narrows -->
                <div [class]="styles.stage(narrow())">
                    <div
                        gridLayoutRoot
                        #root="gridLayoutRoot"
                        [gridLayoutRef]="gridLayoutRef"
                        [breakpoints]="breakpoints"
                        [cols]="cols"
                        [defaultLayouts]="layouts"
                        [rowHeight]="44"
                        [gap]="[10, 10]"
                        [createId]="createId"
                        aria-label="Dashboard"
                        [class]="styles.root(root.state())"
                    >
                        <ng-template gridLayoutItems let-item>
                            @let title = titleOf(item.id);
                            <div
                                [gridLayoutItem]="item.id"
                                #part="gridLayoutItem"
                                [attr.aria-label]="title"
                                [class]="styles.item(part.state())"
                            >
                                <span [class]="styles.title">{{ title }}</span>
                                <span [class]="styles.place">{{
                                    item.id.startsWith("note-")
                                        ? note
                                        : "x " + item.x + " · y " + item.y + " · " + item.w + " × " + item.h
                                }}</span>
                                <div
                                    *gridLayoutResizeHandle="'bottom-end'"
                                    [attr.aria-label]="'Resize ' + title"
                                    [class]="styles.resizeHandle"
                                ></div>
                            </div>
                        </ng-template>
                        <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                    </div>
                </div>
            </div>
            <div *gridLayoutDragPreview="gridLayoutRef; let state" [class]="styles.preview(state)">
                <svg lucideStickyNote [class]="styles.icon"></svg>
                New note
            </div>
        </div>
    `,
})
export default class UndoRedo {
    protected readonly styles = styles;
    protected readonly titleOf = titleOf;
    protected readonly note = NOTE;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly layouts = LAYOUTS;
    protected readonly gridLayoutRef = inject(GRID);
    protected readonly narrow = signal(false);
    private made = 0;
    protected readonly createId = () => {
        this.made += 1;
        return `note-${this.made}`;
    };
}
