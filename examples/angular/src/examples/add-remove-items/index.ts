import { Component, computed, signal } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import { LucidePlus, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

// The layout in the app's state (controlled): adding is a new item in it, at no row in
// particular (`y: Infinity`, below everything: compaction lifts it where there is room);
// removing is the item gone from it. The remove button is a control: pressing it never drags.
@Component({
    selector: "example-add-remove-items",
    imports: [GRID_LAYOUT, ClickableButton, LucidePlus, LucideX],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <p [class]="styles.note">{{ layout().length }} widgets</p>
                <button kitClickable size="sm" [disabled]="!next()" (click)="add()">
                    <svg lucidePlus></svg>
                    Add {{ next()?.title ?? "widget" }}
                </button>
            </div>
            <div
                gridLayoutRoot
                [(layout)]="layout"
                [rowHeight]="56"
                [gap]="[12, 12]"
                aria-label="Dashboard"
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
                        <span [class]="styles.header">
                            <span [class]="styles.title">{{ content.title }}</span>
                            <button
                                kitClickable
                                size="sm"
                                variant="icon"
                                [attr.aria-label]="'Remove ' + content.title"
                                (click)="remove(item.id)"
                            >
                                <svg lucideX></svg>
                            </button>
                        </span>
                        <span [class]="styles.value">{{ content.value }}</span>
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
export default class AddRemoveItems {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly layout = signal<Layout>(dashboard().slice(0, 4));
    /** the first widget not on the grid */
    protected readonly next = computed(() =>
        WIDGETS.find(
            (entry) => !this.layout().some((item) => item.id === entry.id),
        ),
    );

    protected add(): void {
        const next = this.next();
        if (!next) return;
        this.layout.set([
            ...this.layout(),
            { id: next.id, x: 0, y: Number.POSITIVE_INFINITY, w: 4, h: 2 },
        ]);
    }

    protected remove(id: string): void {
        this.layout.set(this.layout().filter((item) => item.id !== id));
    }
}
