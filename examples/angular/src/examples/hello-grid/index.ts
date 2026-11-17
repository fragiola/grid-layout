import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

@Component({
    selector: "example-hello-grid",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [cols]="12"
                [rowHeight]="64"
                [gap]="[12, 12]"
                aria-label="Dashboard"
                [class]="styles.root"
            >
                <!-- The developer owns the recursion: one element per item of the layout. -->
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
                        <span [class]="styles.change(content.change)">
                            {{ formatChange(content.change) }}
                        </span>
                        <svg
                            viewBox="0 0 100 32"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            [class]="styles.chart"
                        >
                            <path [attr.d]="sparkline(content.points)" />
                        </svg>
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
    `,
})
export default class HelloGrid {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly formatChange = formatChange;
    protected readonly sparkline = sparkline;
}
