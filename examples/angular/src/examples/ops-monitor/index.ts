import { Component } from "@angular/core";
import { GRID_LAYOUT, type Layout } from "@fragiola/grid-layout-angular";
import {
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCircleX,
    LucideRadio,
} from "@lucide/angular";
import {
    countByStatus,
    SERVICES,
    type ServiceStatus,
    STATUS_LABELS,
} from "../_kit/datasets";
import * as styles from "./styles";
import { Tile } from "./tile";

const COLS = 12;

// The title bar and the summary are statics: pinned at the top, never dragged and never pushed.
// Under them, one small tile per service, six to a row.
const layout: Layout = [
    { id: "title", x: 0, y: 0, w: COLS, h: 2, static: true },
    { id: "summary", x: 0, y: 2, w: COLS, h: 3, static: true },
    ...SERVICES.map((service, index) => ({
        id: service.id,
        x: (index % 6) * 2,
        y: 5 + Math.floor(index / 6) * 3,
        w: 2,
        h: 3,
    })),
];

const byId = new Map(SERVICES.map((service) => [service.id, service]));
const counts = countByStatus(SERVICES);

// An operations console: dense tiles on small rows (24 px), each saying its service's status in
// a word and an icon as well as a colour. People arrange the tiles as they like; the header tiles
// are `static: true`, so a tile dropped on them settles below instead. Tiles only move here
// (`[resizable]="false"`): their size is the monitor's.
@Component({
    selector: "example-ops-monitor",
    imports: [
        GRID_LAYOUT,
        LucideCircleAlert,
        LucideCircleCheck,
        LucideCircleX,
        LucideRadio,
        Tile,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [cols]="cols"
                [rowHeight]="24"
                [gap]="[6, 6]"
                [resizable]="false"
                aria-label="Services"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @if (item.id === "title") {
                        <div gridLayoutItem="title" aria-label="Ops monitor" [class]="styles.titleBar">
                            <svg lucideRadio [class]="styles.icon"></svg>
                            <span [class]="styles.heading">Ops monitor</span>
                            <span [class]="styles.meta">production · eu-west-1</span>
                            <span [class]="styles.updated">Updated 12:04 UTC</span>
                        </div>
                    } @else if (item.id === "summary") {
                        <div
                            gridLayoutItem="summary"
                            aria-label="Service summary"
                            [class]="styles.summary"
                        >
                            @for (status of statuses; track status) {
                                <span [class]="styles.count(status)">
                                    @switch (status) {
                                        @case ("ok") { <svg lucideCircleCheck [class]="styles.countIcon"></svg> }
                                        @case ("warn") { <svg lucideCircleAlert [class]="styles.countIcon"></svg> }
                                        @case ("down") { <svg lucideCircleX [class]="styles.countIcon"></svg> }
                                    }
                                    <span [class]="styles.countValue">{{ counts[status] }}</span>
                                    <span [class]="styles.countLabel">{{ labels[status] }}</span>
                                </span>
                            }
                        </div>
                    } @else {
                        @let service = byId.get(item.id);
                        @if (service) {
                            <ops-tile [service]="service" />
                        }
                    }
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class OpsMonitor {
    protected readonly styles = styles;
    protected readonly layout = layout;
    protected readonly cols = COLS;
    protected readonly byId = byId;
    protected readonly counts = counts;
    protected readonly labels = STATUS_LABELS;
    /** each status's icon goes with its word: a status never relies on colour alone */
    protected readonly statuses = Object.keys(STATUS_LABELS) as ServiceStatus[];
}
