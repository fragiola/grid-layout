import { Component, type ElementRef, signal, viewChild } from "@angular/core";
import {
    createGridLayoutRef,
    type DropDetails,
    type GestureEvent,
    GRID_LAYOUT,
    injectGridLayoutEvents,
} from "@fragiola/grid-layout-angular";
import { LucideArchive } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { pointerOver } from "../_kit/hit";
import { dashboard } from "../_kit/layouts";
import { type Stowed, stow, unstow } from "../_kit/toolbox";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const layout = dashboard();

// Taking a widget off the grid is the app's (D14): the grid reports a release outside it
// (`(dragStop)` with `outside` and the element under the pointer), and the app removes the item
// and keeps it, with its size, in the toolbox. Each widget there is a drag source with the
// widget's own id: dropped back, the same widget comes back. From the keyboard: the button on a
// widget puts it away; Tab to it in the toolbox and press Enter to bring it back.
@Component({
    selector: "example-toolbox",
    imports: [GRID_LAYOUT, ClickableButton, LucideArchive],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <!-- the toolbox: where widgets go when they leave the grid, each one a drag source back in -->
            <section
                #toolbox
                aria-label="Toolbox"
                [attr.data-open]="open() ? '' : null"
                [class]="styles.toolbox"
            >
                <p [class]="styles.heading">Toolbox</p>
                @for (entry of stowed(); track entry.id) {
                    <div
                        [gridLayoutDragSource]="{ w: entry.w, h: entry.h }"
                        #source="gridLayoutDragSource"
                        [gridLayoutRef]="gridLayoutRef"
                        [itemId]="entry.id"
                        [attr.aria-label]="widget(entry.id).title + ', in the toolbox'"
                        [class]="styles.source(source.state())"
                    >
                        {{ widget(entry.id).title }}
                    </div>
                } @empty {
                    <p [class]="styles.empty">Drag a widget here to put it away.</p>
                }
            </section>
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="layout"
                [rowHeight]="48"
                [gap]="[12, 12]"
                (dragStop)="onDragStop($event)"
                (dropped)="onDrop($event)"
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
                                [attr.aria-label]="'Put ' + content.title + ' in the toolbox'"
                                (click)="putAway(item.id)"
                            >
                                <svg lucideArchive></svg>
                            </button>
                        </span>
                        <span [class]="styles.value">{{ content.value }}</span>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class Toolbox {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly widget = widget;
    protected readonly gridLayoutRef = createGridLayoutRef();
    private readonly toolbox =
        viewChild.required<ElementRef<HTMLElement>>("toolbox");
    protected readonly stowed = signal<readonly Stowed[]>([
        { id: "refunds", w: 4, h: 2 },
    ]);
    /** a widget held over the toolbox: it shows it would take it */
    protected readonly open = signal(false);

    constructor() {
        // the pointer is the grid's while it holds a widget, so the drag's own events say where
        // it is
        injectGridLayoutEvents((event) => {
            this.open.set(
                event.type === "drag" &&
                    event.outside === true &&
                    pointerOver(
                        this.toolbox().nativeElement,
                        event.nativeEvent,
                    ),
            );
        }, this.gridLayoutRef);
    }

    protected putAway(id: string) {
        const model = this.gridLayoutRef.current?.model;
        const item = model?.get("item-by", { itemId: id });
        if (!model || !item) return;
        model.run("item.remove", { itemId: id });
        this.stowed.update((all) => stow(all, item));
    }

    /** released off the grid, over the toolbox: put away */
    protected onDragStop(event: GestureEvent) {
        const target = event.target;
        if (
            event.outside &&
            target &&
            this.toolbox().nativeElement.contains(target)
        )
            this.putAway(event.itemId);
    }

    /** back from the toolbox: it leaves it */
    protected onDrop({ item }: DropDetails) {
        this.stowed.update((all) => unstow(all, item.id));
    }
}
