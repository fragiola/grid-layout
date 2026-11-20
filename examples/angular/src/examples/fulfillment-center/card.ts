import { Component, input } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { LucideGripVertical } from "@lucide/angular";
import * as styles from "./styles";

/**
 * A widget's frame: its header is the grip it moves by (and its tab stop), with a short reading
 * beside it (`aside`); the corner resizes it. `critical` marks the tile (`data-critical`).
 */
@Component({
    selector: "fulfillment-card",
    imports: [GRID_LAYOUT, LucideGripVertical],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="itemId()"
            [attr.aria-label]="label()"
            [attr.data-critical]="critical() ? '' : null"
            [class]="styles.item"
        >
            <span [class]="styles.header">
                <div
                    gridLayoutDragHandle
                    [attr.aria-label]="'Move ' + label()"
                    [class]="styles.handle"
                >
                    <svg lucideGripVertical [class]="styles.grip"></svg>
                    <span [class]="styles.title">{{ label() }}</span>
                </div>
                @if (aside() !== undefined) {
                    <span [class]="styles.aside">{{ aside() }}</span>
                }
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
    readonly aside = input<string>();
    readonly critical = input(false);
    protected readonly styles = styles;
}
