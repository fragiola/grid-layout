import { Component, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { messy } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// A layout no grid would take as it is: items overlap, one runs past the last column, one starts
// left of the first, one has no row (`y: Infinity`). The grid corrects it and tells the app, once,
// through (layoutChange); holding the layout in state, the app keeps what holds.
@Component({
    selector: "example-messy-layout",
    imports: [GRID_LAYOUT, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <p [class]="styles.note" aria-live="polite">
                    Layout changes told: {{ corrections() }}
                </p>
                <button kitClickable size="sm" variant="outline" (click)="layout.set(messy())">
                    Mess it up again
                </button>
            </div>
            <div
                gridLayoutRoot
                [layout]="layout()"
                (layoutChange)="corrected($event)"
                [rowHeight]="48"
                [gap]="[10, 10]"
                aria-label="Corrected layout"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    <div
                        [gridLayoutItem]="item.id"
                        [attr.aria-label]="widget(item.id).title"
                        [class]="styles.item"
                    >
                        <span [class]="styles.title">{{ widget(item.id).title }}</span>
                        <code [class]="styles.box">{{ item.x }},{{ item.y }} · {{ item.w }}×{{ item.h }}</code>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class MessyLayout {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly messy = messy;
    protected readonly layout = signal<Layout>(messy());
    protected readonly corrections = signal(0);

    protected corrected(next: Layout): void {
        this.layout.set(next);
        this.corrections.set(this.corrections() + 1);
    }
}
