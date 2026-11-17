import { Component, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    verticalCompactor,
} from "@fragiola/grid-layout-angular";
import { LucideRotateCcw, LucideShuffle } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const COLS = 12;

const START: Layout = [
    { id: "revenue", x: 0, y: 0, w: 4, h: 2 },
    { id: "orders", x: 4, y: 0, w: 4, h: 2 },
    { id: "visitors", x: 8, y: 0, w: 4, h: 2 },
    { id: "conversion", x: 0, y: 2, w: 3, h: 2 },
    { id: "latency", x: 3, y: 2, w: 5, h: 2 },
    { id: "uptime", x: 8, y: 2, w: 4, h: 2 },
];

/**
 * The same items in another order, packed row by row and settled as the grid settles them (its
 * compactor), so the grid takes the state as it is and tells nothing back. Never the order it had.
 */
function shuffled(layout: Layout): Layout {
    const order = (items: Layout) => items.map((item) => item.id).join();
    let next = [...layout];
    while (next.length > 1 && order(next) === order(layout)) {
        next = [...layout].sort(() => Math.random() - 0.5);
    }
    let x = 0;
    let y = 0;
    let tallest = 0;
    const packed = next.map((item) => {
        if (x + item.w > COLS) {
            x = 0;
            y += tallest;
            tallest = 0;
        }
        const placed = { ...item, x, y };
        x += item.w;
        tallest = Math.max(tallest, item.h);
        return placed;
    });
    return verticalCompactor.compact(packed, COLS);
}

/** One line per item: what the state holds, readable. */
const json = (layout: Layout) =>
    `[\n${layout.map((item) => `  ${JSON.stringify({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })}`).join(",\n")}\n]`;

// The layout lives in a signal: `[(layout)]` gives it to the grid and takes each committed change
// back, once per drag or resize (never during one). Reset and Shuffle only set the signal; the
// grid follows. The JSON is the state itself, not a copy of the grid's.
@Component({
    selector: "example-controlled-layout",
    imports: [GRID_LAYOUT, ClickableButton, LucideShuffle, LucideRotateCcw],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.main">
                <div [class]="styles.toolbar">
                    <button
                        kitClickable
                        size="sm"
                        variant="outline"
                        (click)="layout.set(shuffled(layout()))"
                    >
                        <svg lucideShuffle></svg>
                        Shuffle
                    </button>
                    <button kitClickable size="sm" variant="outline" (click)="layout.set(start)">
                        <svg lucideRotateCcw></svg>
                        Reset
                    </button>
                    <p [class]="styles.note">
                        onLayoutChange calls:
                        <span data-testid="changes">{{ changes() }}</span>
                    </p>
                </div>
                <div
                    gridLayoutRoot
                    [(layout)]="layout"
                    (layoutChange)="changes.set(changes() + 1)"
                    [cols]="cols"
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
            </div>
            <section aria-labelledby="state-title" [class]="styles.panel">
                <h2 id="state-title" [class]="styles.panelTitle">Angular state</h2>
                <pre data-testid="state" [class]="styles.json">{{ json(layout()) }}</pre>
            </section>
        </div>
    `,
})
export default class ControlledLayout {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly shuffled = shuffled;
    protected readonly json = json;
    protected readonly start = START;
    protected readonly cols = COLS;
    protected readonly layout = signal<Layout>(START);
    protected readonly changes = signal(0);
}
