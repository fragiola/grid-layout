import { Component } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-angular";
import * as styles from "./styles";

// allowOverlap: nothing is pushed and nothing settles, so items stack wherever they are dropped,
// like notes on a board. The one dragged last stays on top only while it is held: what is drawn
// over what afterwards is the app's (here, the layout's order).
const notes: Layout = [
    { id: "Call the supplier", x: 0, y: 0, w: 3, h: 2 },
    { id: "Review the Q3 plan", x: 2, y: 1, w: 3, h: 2 },
    { id: "Book the venue", x: 6, y: 0, w: 3, h: 2 },
    { id: "Ship the release", x: 7, y: 1, w: 3, h: 3 },
];

@Component({
    selector: "example-allow-overlap",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="notes"
                [compactor]="noCompactor"
                [allowOverlap]="true"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Notes"
                [class]="styles.root"
            >
                <div
                    *gridLayoutItems="let item"
                    [gridLayoutItem]="item.id"
                    #part="gridLayoutItem"
                    [attr.aria-label]="item.id"
                    [class]="styles.item(part.state())"
                >
                    {{ item.id }}
                    <div
                        *gridLayoutResizeHandle="'bottom-end'"
                        [attr.aria-label]="'Resize ' + item.id"
                        [class]="styles.resizeHandle"
                    ></div>
                </div>
            </div>
        </div>
    `,
})
export default class AllowOverlap {
    protected readonly styles = styles;
    protected readonly notes = notes;
    protected readonly noCompactor = noCompactor;
}
