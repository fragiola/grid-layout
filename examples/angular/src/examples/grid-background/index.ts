import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The grid's cells drawn behind the items, shown only while something moves: `*gridLayoutCells`
// renders one element per cell, placed like a 1 × 1 item, down to the layout's bottom plus a row
// (the preview's, while a drag runs). Their look is the app's: here a dotted outline that fades in
// while the root carries `data-dragging`, `data-resizing` or `data-grabbed` (styles.ts).
@Component({
    selector: "example-grid-background",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[10, 10]"
                aria-label="Dashboard"
                [class]="styles.root"
            >
                <!-- first: drawn under the items -->
                <div *gridLayoutCells="let cell" [class]="styles.cell"></div>
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
    `,
})
export default class GridBackground {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
}
