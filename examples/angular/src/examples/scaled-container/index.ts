import { Component, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5];

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
    { id: "orders", x: 3, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 6, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 4, h: 2 },
    { id: "latency", x: 4, y: 2, w: 4, h: 2 },
];

// The grid on a zoomable canvas: a `transform: scale()` on a wrapper draws it smaller or larger
// without changing its layout. The grid reads the scale off its own box when a gesture starts,
// so a held item stays under the pointer and lands where it is dropped at any zoom, with no
// `scale` input (pass one only when the box cannot tell, e.g. a scale animated mid-gesture).
@Component({
    selector: "example-scaled-container",
    imports: [GRID_LAYOUT, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <fieldset aria-label="Zoom" [class]="styles.segments">
                @for (value of zooms; track value) {
                    <button
                        kitClickable
                        size="sm"
                        [variant]="value === zoom() ? 'solid' : 'outline'"
                        [class]="styles.segment(value === zoom())"
                        [attr.aria-pressed]="value === zoom()"
                        (click)="zoom.set(value)"
                    >
                        {{ value * 100 }}%
                    </button>
                }
            </fieldset>
            <div [class]="styles.viewport">
                <!-- the canvas's zoom: an app's transform, the grid inside it unaware -->
                <div [class]="styles.canvas" [style.transform]="'scale(' + zoom() + ')'">
                    <div
                        gridLayoutRoot
                        [defaultLayout]="layout"
                        [cols]="8"
                        [rowHeight]="48"
                        [gap]="[10, 10]"
                        [padding]="[10, 10]"
                        aria-label="Zoomed dashboard"
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
                                <span [class]="styles.place">
                                    column {{ item.x }}, row {{ item.y }} · {{ item.w }} × {{ item.h }}
                                </span>
                                <div
                                    *gridLayoutResizeHandle="'bottom-end'"
                                    [attr.aria-label]="'Resize ' + content.title"
                                    [class]="styles.resizeHandle"
                                ></div>
                            </div>
                        </ng-template>
                        <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class ScaledContainer {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly zooms = ZOOMS;
    protected readonly zoom = signal(1);
}
