import { Component, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    noCompactor,
} from "@fragiola/grid-layout-angular";
import { type LogLine, prepend } from "../_kit/log";
import { widget } from "../_kit/widgets";
import { Guard } from "./guard";
import { Reserved } from "./reserved";
import type { Refusal } from "./rules";
import * as styles from "./styles";

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 2, h: 2 },
    { id: "latency", x: 2, y: 2, w: 6, h: 2 },
    { id: "uptime", x: 0, y: 4, w: 12, h: 2 },
];

// Two app rules as middleware (`model.use`, rules.ts and guard.ts): the reserved area stays
// empty, and a row holds three widgets at most. Each runs the command first (`next()`), reads the
// layout it would settle into (pushes included) and vetoes it when a rule breaks. A drag asks the
// model at every cell (a dry run through the same middleware), so a refused landing shows the item
// going back, and the drop changes nothing; the log below says why. From the keyboard, a refused
// step is simply not taken. Free placement (`noCompactor`): nothing floats up into the reserved
// area on its own.
@Component({
    selector: "example-middleware",
    imports: [GRID_LAYOUT, Guard, Reserved],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [compactor]="noCompactor"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Dashboard with rules"
                [class]="styles.root"
            >
                <ng-container exampleMiddlewareGuard (refused)="refused($event)" />
                <example-middleware-reserved />
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
            <section aria-labelledby="refused-title" [class]="styles.panel">
                <h2 id="refused-title" [class]="styles.panelTitle">Refused moves</h2>
                <ol role="log" aria-label="Refused moves" [class]="styles.log">
                    @for (line of log(); track line.key) {
                        <li [class]="styles.line">
                            <span [class]="styles.lineHead">
                                {{ widget(line.entry.itemId).title }} {{ line.entry.where }}
                            </span>
                            {{ line.entry.reason }}
                        </li>
                    } @empty {
                        <li [class]="styles.empty">
                            Drag a widget into the reserved area, or a fourth one onto the first row.
                        </li>
                    }
                </ol>
            </section>
        </div>
    `,
})
export default class Middleware {
    protected readonly styles = styles;
    protected readonly layout = LAYOUT;
    protected readonly widget = widget;
    protected readonly noCompactor = noCompactor;
    protected readonly log = signal<readonly LogLine<Refusal>[]>([]);

    protected refused(refusal: Refusal) {
        this.log.set(prepend(this.log(), refusal, 20));
    }
}
