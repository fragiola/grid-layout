import { Component, inject } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
} from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import { GRID } from "./grid";
import { EventLogPanel } from "./log";
import * as styles from "./styles";

const layout = dashboard();

// Two streams, read from outside the root through a `gridLayoutRef`: `model.subscribe` tells
// every committed command with the state before and after it, whoever ran it; the engine's events
// (`injectGridLayoutEvents`) tell every step of a pointer or keyboard gesture. A drag is a
// `drag-start`, its `drag` steps, a `drag-stop`, and one `item.move` between the last two.
@Component({
    selector: "example-event-log",
    imports: [GRID_LAYOUT, EventLogPanel],
    // one ref per example on the page, shared with the log through injection
    providers: [{ provide: GRID, useFactory: createGridLayoutRef }],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
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
            <example-event-log-panel />
        </div>
    `,
})
export default class EventLog {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly gridLayoutRef = inject(GRID);
}
