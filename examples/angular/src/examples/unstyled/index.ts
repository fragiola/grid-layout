import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// The primitives with nothing on top: no theme, no colours, a one-pixel outline so the boxes can
// be seen. Everything the grid layout does is here; everything it looks like is up to you.
@Component({
    selector: "example-unstyled",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div gridLayoutRoot [defaultLayout]="layout" [rowHeight]="56" aria-label="Unstyled grid">
            <ng-template gridLayoutItems let-item>
                <div
                    [gridLayoutItem]="item.id"
                    [attr.aria-label]="widget(item.id).title"
                    [class]="styles.item"
                >
                    {{ widget(item.id).title }}
                    <div
                        *gridLayoutResizeHandle="'bottom-end'"
                        [attr.aria-label]="'Resize ' + widget(item.id).title"
                        [class]="styles.resizeHandle"
                    ></div>
                </div>
            </ng-template>
            <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
        </div>
    `,
})
export default class Unstyled {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
}
