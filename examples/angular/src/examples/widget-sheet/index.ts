import { NgClass } from "@angular/common";
import { Component, computed } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectGridLayoutView,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 1 },
    { id: "orders", x: 0, y: 1, w: 1, h: 1 },
    { id: "visitors", x: 1, y: 1, w: 1, h: 1 },
];

const SHEET = WIDGETS.slice(3, 9);

// A drag source starts at the touch (`touch-action: none` on it): no hold, as a handle. The
// sheet scrolls sideways from its edges, not from a source. From the keyboard, Enter on a source
// brings its widget in at the first free cell. Each source names its widget's own id: what the
// grid shows is the app's content for that id, and a widget on the grid is not offered again.
@Component({
    selector: "example-widget-sheet",
    imports: [GRID_LAYOUT, NgClass],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.phone">
                <div [class]="styles.screen">
                    <div
                        gridLayoutRoot
                        [gridLayoutRef]="gridLayoutRef"
                        [cols]="2"
                        [rowHeight]="84"
                        [gap]="[10, 10]"
                        [defaultLayout]="start"
                        aria-label="Your widgets"
                        [class]="styles.root"
                    >
                        <ng-template gridLayoutItems let-item>
                            @let content = widget(item.id);
                            <div
                                [gridLayoutItem]="item.id"
                                #part="gridLayoutItem"
                                [attr.aria-label]="content.title"
                                [class]="styles.item(part.state())"
                            >
                                <span [class]="styles.title">{{ content.title }}</span>
                                <span [class]="styles.value">{{ content.value }}</span>
                            </div>
                        </ng-template>
                        <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                    </div>
                </div>
                <!-- the widgets the grid does not show yet, each a drag source with the widget's own id -->
                <section aria-label="Widgets to add" [class]="styles.sheet">
                    <p [class]="styles.handle" aria-hidden="true"></p>
                    <div [class]="styles.shelf">
                        <!-- [ngClass], not [class]: Angular runs an element's [class] before its inputs,
                             and a source's state needs its gridLayoutRef input -->
                        @for (entry of left(); track entry.id) {
                            <div
                                [gridLayoutDragSource]="{ w: 1, h: 1 }"
                                #source="gridLayoutDragSource"
                                [gridLayoutRef]="gridLayoutRef"
                                [itemId]="entry.id"
                                [attr.aria-label]="'Add ' + entry.title"
                                [ngClass]="styles.source(source.state())"
                            >
                                <span [class]="styles.title">{{ entry.title }}</span>
                                <span [class]="styles.sourceValue">{{ entry.value }}</span>
                            </div>
                        } @empty {
                            <p [class]="styles.empty">Every widget is on the grid.</p>
                        }
                    </div>
                </section>
                <div
                    *gridLayoutDragPreview="gridLayoutRef; let state"
                    [class]="styles.preview(state)"
                >
                    {{ widget(state.itemId).title }}
                </div>
            </div>
        </div>
    `,
})
export default class WidgetSheet {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly start = START;
    protected readonly gridLayoutRef = createGridLayoutRef();
    private readonly view = injectGridLayoutView(this.gridLayoutRef);
    protected readonly left = computed(() => {
        const layout = this.view()?.layout ?? [];
        return SHEET.filter(
            (entry) => !layout.some((item) => item.id === entry.id),
        );
    });
}
