import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

/** Every widget twice over, three to a row: far taller than the frame. */
const LAYOUT: Layout = [...WIDGETS, ...WIDGETS].map((entry, index) => ({
    id: index < WIDGETS.length ? entry.id : `${entry.id}-2`,
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 2,
    w: 4,
    h: 2,
}));

/** A widget's content: the second copy shows the first's. */
function contentOf(id: string) {
    return widget(id.replace(/-2$/, ""));
}

/** A widget's title: the second copy says so. */
function titleOf(id: string): string {
    const { title } = contentOf(id);
    return id.endsWith("-2") ? `${title} (2)` : title;
}

// The frame scrolls, not the page. Near its top or bottom edge a widget held there (or a corner
// pulled there) scrolls it, faster the closer to the edge (R6), so a widget can be carried from
// the first row to the last in one gesture. `autoScroll` sets the zone and the speed.
@Component({
    selector: "example-long-dashboard",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame" data-testid="scroller">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="52"
                [gap]="[12, 12]"
                [autoScroll]="{ threshold: 48, speed: 24 }"
                aria-label="Long dashboard"
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
                        <span [class]="styles.value">{{ contentOf(item.id).value }}</span>
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
    `,
})
export default class LongDashboard {
    protected readonly styles = styles;
    protected readonly layout = LAYOUT;
    protected readonly contentOf = contentOf;
    protected readonly titleOf = titleOf;
}
