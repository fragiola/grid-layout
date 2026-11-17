import { Component, computed, input, signal } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import { LucideGripVertical, LucideRefreshCw } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

/** A card's content, on its item's element: the grip, the title, a button and a field. */
@Component({
    selector: "[dragHandleCard]",
    imports: [
        GRID_LAYOUT,
        ClickableButton,
        LucideGripVertical,
        LucideRefreshCw,
    ],
    template: `
        <span [class]="styles.header">
            <div
                gridLayoutDragHandle
                #handle="gridLayoutDragHandle"
                [attr.aria-label]="'Move ' + content().title"
                aria-roledescription="drag handle"
                [class]="styles.handle(handle.state())"
            >
                <svg lucideGripVertical></svg>
            </div>
            <span [class]="styles.title">{{ content().title }}</span>
            <button
                kitClickable
                size="sm"
                variant="icon"
                [attr.aria-label]="'Refresh ' + content().title"
                (click)="refreshed.set(refreshed() + 1)"
            >
                <svg lucideRefreshCw></svg>
            </button>
        </span>
        <span [class]="styles.value">{{ content().value }}</span>
        <input
            [attr.aria-label]="'Note on ' + content().title"
            placeholder="Add a note"
            [class]="styles.field"
        />
        <span [class]="styles.note">Refreshed {{ refreshed() }} times</span>
    `,
})
export class Card {
    /** the item's id */
    readonly dragHandleCard = input.required<string>();
    protected readonly styles = styles;
    protected readonly content = computed(() => widget(this.dragHandleCard()));
    protected readonly refreshed = signal(0);
}
