import { Component } from "@angular/core";
import {
    aspectRatio,
    GRID_LAYOUT,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { KeepRatios } from "./keep-ratios";
import * as styles from "./styles";

// An item stores its own constraints as data, so the layout still saves as JSON: a name the
// grid's registry holds, with the factory's arguments. They come after the grid's (gridBounds,
// minMaxSize). aspectRatio keeps the ratio in pixels, the height following the width, as closely
// as whole rows allow.
const ratio = (value: number) => [{ name: "aspectRatio", args: [value] }];

const layout: Layout = [
    { id: "16:9 video", x: 0, y: 0, w: 4, h: 8, constraints: ratio(16 / 9) },
    { id: "4:3 photo", x: 4, y: 0, w: 3, h: 8, constraints: ratio(4 / 3) },
    { id: "1:1 square", x: 7, y: 0, w: 2, h: 7, constraints: ratio(1) },
    { id: "2:1 banner", x: 9, y: 0, w: 3, h: 6, constraints: ratio(2) },
    { id: "Free", x: 0, y: 8, w: 3, h: 3 },
];

// read when the grid is created: a new registry needs a new grid (a remount)
const registry = { aspectRatio };

@Component({
    selector: "example-aspect-ratio",
    imports: [GRID_LAYOUT, KeepRatios],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [constraintRegistry]="registry"
                [rowHeight]="20"
                [gap]="[10, 10]"
                aria-label="Media with fixed ratios"
                [class]="styles.root"
            >
                <example-keep-ratios />
                <ng-template gridLayoutItems let-item>
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="item.id"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ item.id }}</span>
                        <span [class]="styles.value">{{ item.w }} × {{ item.h }}</span>
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize ' + item.id"
                            [class]="styles.resizeHandle"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class AspectRatio {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly registry = registry;
}
