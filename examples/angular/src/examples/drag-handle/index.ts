import { Component } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { dashboard } from "../_kit/layouts";
import { widget } from "../_kit/widgets";
import { Card } from "./card";
import * as styles from "./styles";

const layout = dashboard().slice(0, 4);

// Each card drags only from its grip: a DragHandle makes itself the only place the item moves
// from, and the item's tab stop. The card's body is the app's: a field to type in and a button
// to press, neither of which ever starts a drag.
@Component({
    selector: "example-drag-handle",
    imports: [GRID_LAYOUT, Card],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [rowHeight]="76"
                [gap]="[12, 12]"
                aria-label="Cards with handles"
                [class]="styles.root"
            >
                <!-- the card is a component on the item's own element -->
                <div
                    *gridLayoutItems="let item"
                    [gridLayoutItem]="item.id"
                    #part="gridLayoutItem"
                    [dragHandleCard]="item.id"
                    [attr.aria-label]="widget(item.id).title"
                    [class]="styles.item(part.state())"
                ></div>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class DragHandle {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
}
