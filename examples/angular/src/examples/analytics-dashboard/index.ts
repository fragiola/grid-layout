import { Component, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    type Layout,
    layoutProblems,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { forget, load, save } from "../_kit/storage";
import * as styles from "./styles";
import { Widget } from "./widgets";

const KEY = "grid-layout:analytics-dashboard";
const BREAKPOINTS = { lg: 900, md: 600, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 4 };

const KPIS = ["revenue", "orders", "visitors", "conversion"];

/** Every breakpoint's layout, given whole: none is generated (and saved) before a change. */
const DEFAULTS: Record<string, Layout> = {
    lg: [
        ...KPIS.map((id, index) => ({ id, x: index * 3, y: 0, w: 3, h: 3 })),
        { id: "traffic", x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 5 },
        { id: "channels", x: 8, y: 3, w: 4, h: 6, minW: 3, minH: 5 },
        { id: "pages", x: 0, y: 9, w: 12, h: 5, minW: 4, minH: 4 },
    ],
    md: [
        ...KPIS.map((id, index) => ({
            id,
            x: (index % 2) * 4,
            y: Math.floor(index / 2) * 3,
            w: 4,
            h: 3,
        })),
        { id: "traffic", x: 0, y: 6, w: 8, h: 6, minW: 4, minH: 5 },
        { id: "channels", x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 5 },
        { id: "pages", x: 4, y: 12, w: 4, h: 6, minW: 4, minH: 4 },
    ],
    sm: [
        ...KPIS.map((id, index) => ({
            id,
            x: (index % 2) * 2,
            y: Math.floor(index / 2) * 3,
            w: 2,
            h: 3,
        })),
        { id: "traffic", x: 0, y: 6, w: 4, h: 6, minH: 5 },
        { id: "channels", x: 0, y: 12, w: 4, h: 6, minH: 5 },
        { id: "pages", x: 0, y: 18, w: 4, h: 6, minH: 4 },
    ],
};

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

// A store's analytics, as an app would build it: KPI tiles and charts drawn from the app's data,
// each widget moved by the grip in its header (a drag handle) and resized from its corner. The
// filters in a header are native controls, which never start a drag. Three breakpoints, each
// with its own layout, all saved as they change and restored on the next visit.
@Component({
    selector: "example-analytics-dashboard",
    imports: [GRID_LAYOUT, ClickableButton, Widget],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <header [class]="styles.toolbar">
                <h2 [class]="styles.heading">Store analytics</h2>
                <p role="status" [class]="styles.status">{{ status() }}</p>
                <button kitClickable size="sm" variant="outline" (click)="reset()">
                    Reset layout
                </button>
            </header>
            <!-- a new grid on reset: defaultLayouts is read once, when a grid starts -->
            @for (run of [run()]; track "run-" + run) {
                <div
                    gridLayoutRoot
                    [breakpoints]="breakpoints"
                    [cols]="cols"
                    [defaultLayouts]="start()"
                    (layoutsChange)="persist($event)"
                    [rowHeight]="32"
                    [gap]="[12, 12]"
                    aria-label="Store analytics"
                    [class]="styles.root"
                >
                    <ng-template gridLayoutItems let-item>
                        <analytics-widget [id]="item.id" />
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class AnalyticsDashboard {
    protected readonly styles = styles;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly run = signal(0);
    // read once: `defaultLayouts` is read when a grid starts
    private readonly first = saved();
    protected readonly start = signal(this.first ?? DEFAULTS);
    protected readonly status = signal(
        this.first ? "Restored your layout" : "",
    );

    protected reset() {
        forget(KEY);
        this.start.set(DEFAULTS);
        this.status.set("Back to the default layout");
        this.run.update((count) => count + 1);
    }

    protected persist(layouts: Readonly<Record<string, Layout>>) {
        this.status.set(
            save(KEY, layouts)
                ? "Layout saved"
                : "Could not save (storage is blocked)",
        );
    }
}
