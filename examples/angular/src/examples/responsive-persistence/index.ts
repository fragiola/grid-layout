import { Component, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { dashboard } from "../_kit/layouts";
import { forget, load, save } from "../_kit/storage";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const KEY = "grid-layout:responsive-persistence";
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

/**
 * Every breakpoint's default layout, the widgets packed in reading order in its columns: given
 * whole, so nothing is generated (and saved) before anyone moves anything.
 */
function defaults(): Record<string, Layout> {
    const ids = dashboard().map((item) => item.id);
    return Object.fromEntries(
        Object.entries(COLS).map(([name, cols]) => {
            const w = Math.min(4, cols);
            const perRow = Math.floor(cols / w);
            return [
                name,
                ids.map((id, index) => ({
                    id,
                    x: (index % perRow) * w,
                    y: Math.floor(index / perRow) * 2,
                    w,
                    h: 2,
                })),
            ];
        }),
    );
}

/** The saved layouts, if the grid can use them: storage holds whatever was written. */
function saved(): Record<string, Layout> | undefined {
    const layouts = load<Record<string, Layout>>(KEY);
    if (!layouts || typeof layouts !== "object") return undefined;
    const usable = Object.entries(layouts).every(
        ([name, layout]) =>
            Object.hasOwn(BREAKPOINTS, name) &&
            layoutProblems(layout).length === 0,
    );
    return usable ? layouts : undefined;
}

// Persistence is the app's (D14): `(layoutsChange)` tells every breakpoint's layout with the
// active one, so saving the map keeps each breakpoint as it was left. Every breakpoint's default
// is given, so none is generated (a generated one is told, and would be saved, at once). Reset
// forgets them and starts a new grid from the defaults.
@Component({
    selector: "example-responsive-persistence",
    imports: [GRID_LAYOUT, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <p [class]="styles.note" aria-live="polite">{{ status() }}</p>
                <button kitClickable size="sm" variant="outline" (click)="reset()">
                    Reset
                </button>
            </div>
            <!-- a new grid on each reset: \`defaultLayouts\` is read when a grid starts -->
            @for (run of [run()]; track 'run-' + run) {
                <div
                    gridLayoutRoot
                    [breakpoints]="breakpoints"
                    [cols]="cols"
                    [defaultLayouts]="start()"
                    (layoutsChange)="persist($event)"
                    [rowHeight]="52"
                    [gap]="[12, 12]"
                    aria-label="Saved responsive dashboard"
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
                            <span [class]="styles.title">{{ content.title }}</span>
                            <span [class]="styles.value">{{ content.value }}</span>
                        </div>
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class ResponsivePersistence {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly run = signal(0);
    // read once: `defaultLayouts` is read when a grid starts
    private readonly first = saved();
    protected readonly start = signal(this.first ?? defaults());
    protected readonly status = signal(
        this.first ? "Restored the saved layouts" : "The default layouts",
    );

    protected persist(layouts: Readonly<Record<string, Layout>>) {
        this.status.set(
            save(KEY, layouts)
                ? `Saved ${Object.keys(layouts).length} layouts`
                : "Could not save (storage is blocked)",
        );
    }

    protected reset() {
        forget(KEY);
        this.start.set(defaults());
        this.status.set("Back to the default layouts");
        this.run.update((count) => count + 1);
    }
}
