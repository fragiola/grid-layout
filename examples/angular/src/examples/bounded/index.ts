import { Component, signal } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { SWITCH } from "#/components/ui/switch";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

let next = 0;

// `bounded`: a dragged item stays inside the root, whatever the pointer does. Off, it follows
// the pointer past the edges and lands on the nearest cell inside.
@Component({
    selector: "example-bounded",
    imports: [GRID_LAYOUT, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.option">
                    <button kitSwitch [(checked)]="bounded" [attr.aria-labelledby]="label">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="label">Keep dragged items inside the grid</span>
                </span>
            </div>
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [bounded]="bounded()"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="Bounded dashboard"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="widget(item.id).title"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ widget(item.id).title }}</span>
                        <span [class]="styles.value">{{ widget(item.id).value }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class Bounded {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly bounded = signal(true);
    protected readonly label = `bounded-label-${++next}`;
}
