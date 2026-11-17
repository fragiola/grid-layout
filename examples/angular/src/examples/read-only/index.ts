import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { formatChange, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// A layout that only shows: `draggable` and `resizable` off for the whole grid. The same items,
// no gesture, and no tab stops of their own (they are not something to move).
@Component({
    selector: "example-read-only",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [draggable]="false"
                [resizable]="false"
                [rowHeight]="64"
                [gap]="[12, 12]"
                aria-label="Read-only dashboard"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let content = widget(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        [attr.aria-label]="content.title"
                        tabindex="-1"
                        [class]="styles.item"
                    >
                        <span [class]="styles.title">{{ content.title }}</span>
                        <span [class]="styles.value">{{ content.value }}</span>
                        <span [class]="styles.change">{{ formatChange(content.change) }}</span>
                        <!-- never shown: the grid does not resize -->
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize ' + content.title"
                        ></div>
                    </div>
                </ng-template>
            </div>
        </div>
    `,
})
export default class ReadOnly {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly formatChange = formatChange;
}
