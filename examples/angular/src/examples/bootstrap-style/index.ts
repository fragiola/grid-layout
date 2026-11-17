import { Component, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 };

/** Each card's width at each breakpoint, of twelve columns. */
const WIDTHS: Record<string, number> = { lg: 3, md: 4, sm: 6, xs: 12 };

const CARDS = WIDGETS.slice(0, 8);

/** The cards in reading order, `w` columns each: a full row, then the next. */
function rows(w: number): Layout {
    return CARDS.map((card, index) => ({
        id: card.id,
        x: (index * w) % 12,
        y: Math.floor((index * w) / 12) * 2,
        w,
        h: 2,
    }));
}

const LAYOUTS = Object.fromEntries(
    Object.entries(WIDTHS).map(([name, w]) => [name, rows(w)]),
);

const card = (id: string) => CARDS.find((each) => each.id === id);

// The same twelve columns at every breakpoint; what changes is each card's width, given per
// breakpoint as its own layout. Every layout is given, so none is generated.
@Component({
    selector: "example-bootstrap-style",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <p [class]="styles.note" data-testid="breakpoint">
                {{ at() }}: each card is {{ widths[at()] }} of 12 columns
            </p>
            <div
                gridLayoutRoot
                [breakpoints]="breakpoints"
                [cols]="12"
                [defaultLayouts]="layouts"
                (breakpointChange)="at.set($event.breakpoint)"
                [rowHeight]="44"
                [gap]="[12, 12]"
                aria-label="Cards"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let content = card(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="content?.title ?? item.id"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ content?.title }}</span>
                        <span [class]="styles.value">{{ content?.value }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class BootstrapStyle {
    protected readonly styles = styles;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly widths = WIDTHS;
    protected readonly layouts = LAYOUTS;
    protected readonly card = card;
    protected readonly at = signal("lg");
}
