import { Component, input } from "@angular/core";
import { GRID_LAYOUT } from "@fragiola/grid-layout-angular";
import {
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCircleX,
} from "@lucide/angular";
import { type Service, STATUS_LABELS } from "../_kit/datasets";
import * as styles from "./styles";

/** A service's tile: its status in a word and an icon as well as a colour. */
@Component({
    selector: "ops-tile",
    imports: [GRID_LAYOUT, LucideCircleAlert, LucideCircleCheck, LucideCircleX],
    host: { class: "contents" },
    template: `
        <div
            [gridLayoutItem]="service().id"
            #part="gridLayoutItem"
            [attr.aria-label]="service().name"
            [attr.data-status]="service().status"
            [class]="styles.tile(part.state())"
        >
            <span [class]="styles.stripe(service().status)"></span>
            <span [class]="styles.name">{{ service().name }}</span>
            <span [class]="styles.badge(service().status)">
                @switch (service().status) {
                    @case ("ok") { <svg lucideCircleCheck [class]="styles.badgeIcon"></svg> }
                    @case ("warn") { <svg lucideCircleAlert [class]="styles.badgeIcon"></svg> }
                    @case ("down") { <svg lucideCircleX [class]="styles.badgeIcon"></svg> }
                }
                {{ labels[service().status] }}
            </span>
            <span [class]="styles.metrics">
                {{ service().p95 }} ms · {{ service().errors }}% err
            </span>
        </div>
    `,
})
export class Tile {
    readonly service = input.required<Service>();
    protected readonly styles = styles;
    protected readonly labels = STATUS_LABELS;
}
