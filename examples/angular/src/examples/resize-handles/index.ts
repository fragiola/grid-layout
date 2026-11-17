import { Component } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    type ResizeSide,
} from "@fragiola/grid-layout-angular";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Every side and corner a person can pull: logical ones, so in right-to-left `start` is the right
// edge and nothing else changes. Where each handle sits and what it looks like is the app's: here,
// thin bars on the edges and squares on the corners, shown on hover and focus.
const SIDES: readonly ResizeSide[] = [
    "top",
    "bottom",
    "start",
    "end",
    "top-start",
    "top-end",
    "bottom-start",
    "bottom-end",
];

const layout: Layout = [
    { id: "revenue", x: 1, y: 1, w: 4, h: 3 },
    { id: "orders", x: 6, y: 1, w: 4, h: 2 },
    { id: "visitors", x: 6, y: 3, w: 4, h: 2 },
];

@Component({
    selector: "example-resize-handles",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="48"
                [gap]="[12, 12]"
                aria-label="Resizable widgets"
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
                        <span [class]="styles.size">{{ item.w }} × {{ item.h }}</span>
                        @for (side of sides; track side) {
                            <div
                                *gridLayoutResizeHandle="side; let state"
                                [attr.aria-label]="'Resize ' + content.title + ' from the ' + side.replace('-', ' ')"
                                [class]="styles.handle(side)(state)"
                            ></div>
                        }
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class ResizeHandles {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly sides = SIDES;
}
