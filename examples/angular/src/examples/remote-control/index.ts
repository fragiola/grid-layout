import { Component, inject } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { Controls } from "./controls";
import { GRID } from "./grid";
import * as styles from "./styles";
import { titleOf } from "./titles";

const LAYOUT: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 1, w: 4, h: 2 },
    { id: "latency", x: 0, y: 3, w: 6, h: 2 },
    { id: "uptime", x: 6, y: 3, w: 6, h: 2 },
];

// A form beside the grid drives it from outside its root, through a `gridLayoutRef`: each button
// runs one command (`model.run`), and is enabled only when `model.check` says the command would
// apply. A static item cannot move or resize; a cell outside the columns is not a place; the
// reason the model gives is shown under the form.
@Component({
    selector: "example-remote-control",
    imports: [GRID_LAYOUT, Controls],
    // one ref per example on the page, shared with the form through injection
    providers: [{ provide: GRID, useFactory: createGridLayoutRef }],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-remote-control-controls />
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="layout"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Dashboard"
                [class]="styles.root"
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
                        <span [class]="styles.place">
                            x {{ item.x }} · y {{ item.y }} · {{ item.w }} × {{ item.h }}
                        </span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class RemoteControl {
    protected readonly styles = styles;
    protected readonly layout = LAYOUT;
    protected readonly titleOf = titleOf;
    protected readonly gridLayoutRef = inject(GRID);
}
