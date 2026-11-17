import { NgClass } from "@angular/common";
import { Component, computed, effect, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectGridLayout,
    injectGridLayoutView,
    type Layout,
    veto,
} from "@fragiola/grid-layout-angular";
import * as styles from "./styles";

/** The columns nothing may be dropped into: the last three. */
const LOCKED_FROM = 9;

const SOURCES = [
    { kind: "kpi", title: "KPI", rule: "anywhere free", w: 3, h: 2 },
    { kind: "clock", title: "Clock", rule: "one at most", w: 3, h: 2 },
    { kind: "banner", title: "Banner", rule: "shrinks to fit", w: 9, h: 1 },
] as const;

const START: Layout = [{ id: "kpi-0", x: 0, y: 0, w: 3, h: 2 }];

// Every drop is one `item.add` through the model's middleware, and the preview is its dry run:
// what the rules refuse shows refused (`data-drop-refused`, no placeholder), what they rewrite
// shows rewritten. Each source names its new item's id (`clock-2`), so the rules can tell kinds
// apart; the reason a rule gives is the app's to show.
@Component({
    selector: "example-drop-rules",
    imports: [GRID_LAYOUT, NgClass],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <aside [class]="styles.sidebar" aria-label="Widgets">
                <!-- [ngClass], not [class]: Angular runs an element's [class] before its inputs,
                     and a source's state needs its gridLayoutRef input -->
                @for (source of sources; track source.kind) {
                    <div
                        [gridLayoutDragSource]="{ w: source.w, h: source.h, minW: 3 }"
                        #part="gridLayoutDragSource"
                        [gridLayoutRef]="gridLayoutRef"
                        [itemId]="source.kind + '-' + made()"
                        [attr.aria-label]="source.title + ', ' + source.rule"
                        [ngClass]="styles.source(part.state())"
                    >
                        <span [class]="styles.sourceTitle">{{ source.title }}</span>
                        <span [class]="styles.sourceText">{{ source.rule }}</span>
                    </div>
                }
                <!-- what the rules say about the drop in progress -->
                <p role="status" [class]="styles.verdict">{{ verdict() }}</p>
            </aside>
            <div
                gridLayoutRoot
                #root="gridLayoutRoot"
                [gridLayoutRef]="gridLayoutRef"
                [defaultLayout]="start"
                [rowHeight]="48"
                [gap]="[12, 12]"
                (dropped)="made.set(made() + 1)"
                aria-label="Dashboard with rules"
                [class]="styles.root(root.state())"
            >
                <!-- the locked columns, drawn under the items: a picture of the rule, no part -->
                <div aria-hidden="true" [class]="styles.locked">Locked</div>
                <ng-template gridLayoutItems let-item>
                    @let title = item.id.replace('-', ' ');
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="title"
                        [class]="styles.item(part.state())"
                    >
                        {{ title }}
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class DropRules {
    protected readonly styles = styles;
    protected readonly sources = SOURCES;
    protected readonly start = START;
    protected readonly gridLayoutRef = createGridLayoutRef();
    protected readonly made = signal(1);
    /** why the rules last refused: written by the middleware, read with the view it refused */
    private reason = "";
    private readonly grid = injectGridLayout(this.gridLayoutRef);
    private readonly view = injectGridLayoutView(this.gridLayoutRef);
    protected readonly verdict = computed(() => {
        const view = this.view();
        const dropping =
            view?.gesture?.kind === "drop" && !view.gesture.outside;
        return view?.dropRefused
            ? this.reason
            : dropping
              ? "Allowed here."
              : "Drag a widget onto the grid.";
    });

    constructor() {
        // the rules, as middleware on `item.add`: they run for the preview's dry run and the drop
        effect((onCleanup) => {
            const model = this.grid()?.model;
            if (!model) return;
            onCleanup(
                model.use((ctx, next) => {
                    if (ctx.command !== "item.add") return next();
                    const { item } = ctx.payload;
                    const x = item.x ?? 0;
                    const layout =
                        ctx.state.layouts[ctx.state.breakpoint] ?? [];
                    if (
                        item.id.startsWith("clock") &&
                        layout.some((entry) => entry.id.startsWith("clock"))
                    ) {
                        this.reason = "One clock at most.";
                        return veto(this.reason);
                    }
                    // a banner shrinks to end where the locked columns start, never below its
                    // minimum
                    if (
                        item.id.startsWith("banner") &&
                        x + item.w > LOCKED_FROM
                    ) {
                        const fit = LOCKED_FROM - x;
                        if (fit >= (item.minW ?? 1))
                            ctx.payload = { item: { ...item, w: fit } };
                    }
                    if (x + ctx.payload.item.w > LOCKED_FROM) {
                        this.reason = "The last three columns are locked.";
                        return veto(this.reason);
                    }
                    return next();
                }),
            );
        });
    }
}
