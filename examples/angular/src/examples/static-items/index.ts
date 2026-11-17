import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { LucidePin } from "@lucide/angular";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

// Two statics: a banner across the top and a pinned widget. A static never moves, by a person
// or by compaction: the other items flow around it, and one dropped on it goes around it too.
const layout: Layout = [
    { id: "banner", x: 0, y: 0, w: 12, h: 1, static: true },
    { id: "revenue", x: 0, y: 1, w: 4, h: 2 },
    { id: "orders", x: 4, y: 1, w: 4, h: 2 },
    { id: "uptime", x: 8, y: 1, w: 4, h: 2, static: true },
    { id: "visitors", x: 0, y: 3, w: 6, h: 2 },
    { id: "latency", x: 6, y: 3, w: 6, h: 2 },
];

/** The item's name: the banner is not a widget. */
const nameOf = (id: string) =>
    id === "banner" ? "Announcements" : widget(id).title;

@Component({
    selector: "example-static-items",
    imports: [GRID_LAYOUT, LucidePin],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="Dashboard with pinned items"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let name = nameOf(item.id);
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="name"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">
                            <!-- lucide hides an icon unless it has a title -->
                            @if (item.static) {
                                <svg lucidePin title="Pinned" aria-label="Pinned" [class]="styles.pin"></svg>
                            }
                            {{ name }}
                        </span>
                        @if (item.id === "banner") {
                            <span [class]="styles.note">
                                Statics stay put; the rest flow around them.
                            </span>
                        } @else {
                            <span [class]="styles.value">{{ widget(item.id).value }}</span>
                        }
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class StaticItems {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly nameOf = nameOf;
}
