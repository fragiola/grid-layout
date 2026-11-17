import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Each item's own limits: a resize stops at them, whichever side pulls. They are part of the
// layout (minW, maxW, minH, maxH), so a layout that breaks them is corrected on load too.
const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "orders", x: 3, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    { id: "visitors", x: 7, y: 0, w: 3, h: 2, maxW: 3, maxH: 3 },
    { id: "latency", x: 0, y: 2, w: 6, h: 1, minH: 1, maxH: 1 },
];

const limits = (item: Layout[number]) =>
    [
        `width ${item.minW ?? 1}–${item.maxW ?? "∞"}`,
        `height ${item.minH ?? 1}–${item.maxH ?? "∞"}`,
    ].join(", ");

@Component({
    selector: "example-min-max-size",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="Widgets with size limits"
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
                        <span [class]="styles.value">{{ item.w }} × {{ item.h }}</span>
                        <span [class]="styles.note">{{ limits(item) }}</span>
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
export default class MinMaxSize {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly limits = limits;
}
