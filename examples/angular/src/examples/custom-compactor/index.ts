import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { widget } from "../_kit/widgets";
import { gravityCompactor } from "./gravity";
import * as styles from "./styles";

/** Four shelves, the widgets scattered along them: the compactor slides them to the start. */
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 1 },
    { id: "orders", x: 6, y: 0, w: 3, h: 1 },
    { id: "visitors", x: 2, y: 1, w: 3, h: 1 },
    { id: "conversion", x: 7, y: 1, w: 3, h: 1 },
    { id: "refunds", x: 0, y: 2, w: 5, h: 1 },
    { id: "latency", x: 8, y: 2, w: 4, h: 1 },
    { id: "uptime", x: 4, y: 3, w: 4, h: 1 },
];

// A compactor of your own (gravity.ts): rows are shelves, and every widget slides toward the
// start of its shelf until it meets another. Drop one at the end of a row and it slides back
// against the last one there; the shelves never close up. `createCompactor` (from
// `/compactors`) does the bookkeeping: the order, the statics, a copy that is never the input.
@Component({
    selector: "example-custom-compactor",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [compactor]="gravityCompactor"
                [rowHeight]="56"
                [gap]="[10, 10]"
                aria-label="Shelves"
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
                        <div
                            *gridLayoutResizeHandle="'end'"
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
export default class CustomCompactor {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly gravityCompactor = gravityCompactor;
}
