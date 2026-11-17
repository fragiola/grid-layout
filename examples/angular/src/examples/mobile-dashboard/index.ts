import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { tablet: 600, phone: 0 };
const COLS = { tablet: 4, phone: 1 };
const LAYOUTS = { tablet: dashboard().map((item) => ({ ...item, w: 2 })) };

// On a phone a card's body is held before it moves (R5): a swipe scrolls the page as always, a
// hold of a quarter second lifts the card, which says so through `data-pressing` while the hold
// lasts (the look is the app's: here a ring and a slight shrink). Near the frame's edges a held
// card scrolls it (R6). The phone breakpoint is the grid's own width's: this frame is narrow.
@Component({
    selector: "example-mobile-dashboard",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.phone" data-testid="phone">
                <p [class]="styles.hint">Swipe to scroll. Hold a card, then move it.</p>
                <div
                    gridLayoutRoot
                    [breakpoints]="breakpoints"
                    [cols]="cols"
                    [defaultLayouts]="layouts"
                    [rowHeight]="88"
                    [gap]="[12, 12]"
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
                            <span [class]="styles.change">{{ formatChange(content.change) }}</span>
                        </div>
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            </div>
        </div>
    `,
})
export default class MobileDashboard {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly formatChange = formatChange;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly layouts = LAYOUTS;
}
