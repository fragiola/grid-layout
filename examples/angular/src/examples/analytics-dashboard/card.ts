import { Component, input } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { LucideGripVertical } from "@lucide/angular";
import * as styles from "./styles";

/**
 * A widget's frame: its header is the grip it moves by (and its tab stop), with room for the
 * widget's own controls beside it (the content marked `cardControls`: a native control, so it
 * never starts a drag); the corner resizes it.
 */
@Component({
    selector: "analytics-card",
    imports: [GRID_LAYOUT, LucideGripVertical],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="itemId()"
            #part="gridLayoutItem"
            [attr.aria-label]="label()"
            [class]="styles.item(part.state())"
        >
            <span [class]="styles.header">
                <div
                    gridLayoutDragHandle
                    #handle="gridLayoutDragHandle"
                    [attr.aria-label]="'Move ' + label()"
                    [class]="styles.handle(handle.state())"
                >
                    <svg lucideGripVertical [class]="styles.grip"></svg>
                    <span [class]="styles.title">{{ label() }}</span>
                </div>
                <ng-content select="[cardControls]" />
            </span>
            <ng-content />
            <div
                *gridLayoutResizeHandle="'bottom-end'"
                [attr.aria-label]="'Resize ' + label()"
                [class]="styles.resizeHandle"
            ></div>
        </div>
    `,
})
export class Card {
    readonly itemId = input.required<string>();
    readonly label = input.required<string>();
    protected readonly styles = styles;
}
