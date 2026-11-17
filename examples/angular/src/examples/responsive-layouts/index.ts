import { Component, computed } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectBreakpoint,
    injectGridLayoutView,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { LucidePlus, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

// lg and sm are given; md, xs and xxs are generated the first time the grid is that wide, from
// the nearest larger breakpoint's layout (R3), and kept from then on
const LAYOUTS: Record<string, Layout> = {
    lg: dashboard(),
    sm: [
        { id: "revenue", x: 0, y: 0, w: 3, h: 2 },
        { id: "orders", x: 3, y: 0, w: 3, h: 2 },
        { id: "visitors", x: 0, y: 2, w: 6, h: 2 },
        { id: "conversion", x: 0, y: 4, w: 2, h: 2 },
        { id: "latency", x: 2, y: 4, w: 4, h: 2 },
        { id: "uptime", x: 0, y: 6, w: 6, h: 2 },
    ],
};

const GAP = {
    lg: [12, 12],
    md: [12, 12],
    sm: [10, 10],
    xs: [8, 8],
    xxs: [8, 8],
} as const;

// The breakpoint is the grid's own width's, never the window's (R1): resize the frame and the
// grid takes the widest breakpoint whose minimum it reaches, with that breakpoint's columns and
// layout. A widget added or removed on one breakpoint is on the others too. The toolbar reads the
// grid from outside its root, through the ref.
@Component({
    selector: "example-responsive-layouts",
    imports: [GRID_LAYOUT, ClickableButton, LucidePlus, LucideX],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <!-- the breakpoint is said when it changes; the width, changing every pixel, is only shown -->
                <p [class]="styles.note">
                    <span aria-live="polite" data-testid="breakpoint">{{ current() ? current()?.breakpoint + ' · ' + current()?.cols + ' columns' : 'Measuring…' }}</span>{{ current() ? ' · ' + round(current()?.width) + 'px' : '' }}
                </p>
                <!-- adds the first widget the grid does not show, below everything (every breakpoint gets it) -->
                <button kitClickable size="sm" [disabled]="!next()" (click)="add()">
                    <svg lucidePlus></svg>
                    Add {{ next()?.title ?? 'widget' }}
                </button>
            </div>
            <div
                gridLayoutRoot
                [gridLayoutRef]="gridLayoutRef"
                [breakpoints]="breakpoints"
                [cols]="cols"
                [defaultLayouts]="layouts"
                [rowHeight]="52"
                [gap]="gap"
                aria-label="Responsive dashboard"
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
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class ResponsiveLayouts {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly layouts = LAYOUTS;
    protected readonly gap = GAP;
    protected readonly gridLayoutRef = createGridLayoutRef();
    protected readonly current = injectBreakpoint(this.gridLayoutRef);
    private readonly view = injectGridLayoutView(this.gridLayoutRef);
    /** the first widget the grid does not show */
    protected readonly next = computed(() => {
        const layout = this.view()?.layout ?? [];
        return WIDGETS.find(
            (entry) => !layout.some((item) => item.id === entry.id),
        );
    });

    protected round(width: number | undefined) {
        return Math.round(width ?? 0);
    }

    protected add() {
        const next = this.next();
        if (!next) return;
        this.gridLayoutRef.current?.model.run("item.add", {
            item: {
                id: next.id,
                x: 0,
                y: Number.POSITIVE_INFINITY,
                w: 2,
                h: 2,
            },
        });
    }

    protected remove(id: string) {
        this.gridLayoutRef.current?.model.run("item.remove", { itemId: id });
    }
}
