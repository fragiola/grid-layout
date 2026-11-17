import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { LucideGripHorizontal } from "@lucide/angular";
import { formatChange, sparkline, widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout: Layout = [
    { id: "revenue", x: 0, y: 0, w: 5, h: 3 },
    { id: "orders", x: 5, y: 0, w: 4, h: 2 },
    { id: "signups", x: 9, y: 0, w: 3, h: 2 },
    { id: "visitors", x: 5, y: 2, w: 7, h: 2 },
    { id: "nps", x: 0, y: 3, w: 2, h: 2 },
    { id: "latency", x: 2, y: 3, w: 3, h: 2 },
    { id: "uptime", x: 5, y: 4, w: 7, h: 2 },
];

// Everything the grid layout looks like, from outside: cards glide into place, the one held
// lifts and tilts a little (the `rotate` and `scale` properties, so the engine's `transform`
// stays its own), the placeholder is striped, and the grip and the corner appear on hover or
// focus. All of it in styles.ts, read from data-* and the theme's tokens.
@Component({
    selector: "example-styling-showcase",
    imports: [GRID_LAYOUT, LucideGripHorizontal],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="60"
                [gap]="[14, 14]"
                aria-label="Showcase dashboard"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let content = widget(item.id);
                    @let line = sparkline(content.points);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="content.title"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.header">
                            <span [class]="styles.title">{{ content.title }}</span>
                            <div
                                gridLayoutDragHandle
                                [attr.aria-label]="'Move ' + content.title"
                                [class]="styles.grip"
                            >
                                <svg lucideGripHorizontal></svg>
                            </div>
                        </span>
                        <span [class]="styles.figure">
                            <span [class]="styles.value">{{ content.value }}</span>
                            <span [class]="styles.change(content.change)">
                                {{ formatChange(content.change) }}
                            </span>
                        </span>
                        <svg
                            viewBox="0 0 100 32"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            [class]="styles.chart"
                        >
                            <path [attr.d]="line + ' L100,32 L0,32 Z'" [class]="styles.area" />
                            <path [attr.d]="line" [class]="styles.line" />
                        </svg>
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize ' + content.title"
                            [class]="styles.corner"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class StylingShowcase {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly formatChange = formatChange;
    protected readonly sparkline = sparkline;
}
