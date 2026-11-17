import { Component, computed, input } from "@angular/core";
import {
    GRID_LAYOUT,
    injectGridLayoutView,
} from "@fragiola/grid-layout-angular";
import * as styles from "./styles";

/** The board's lanes, four columns each, start to end. */
export const LANES = [
    { id: "lane-todo", title: "To do" },
    { id: "lane-doing", title: "Doing" },
    { id: "lane-done", title: "Done" },
] as const;

/** Which lane a column is in. */
export function laneOf(x: number): number {
    return Math.min(Math.floor(x / 4), LANES.length - 1);
}

/** A lane's header: a static item across its four columns, with how many notes it holds. */
@Component({
    selector: "kanban-lane-header",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [gridLayoutItem]="id()" [attr.aria-label]="title()" [class]="styles.lane">
            <span [class]="styles.laneTitle">{{ title() }}</span>
            <span [class]="styles.laneCount">{{ count() }}</span>
        </div>
    `,
})
export class LaneHeader {
    readonly id = input.required<string>();
    protected readonly styles = styles;
    private readonly view = injectGridLayoutView();
    private readonly index = computed(() =>
        LANES.findIndex((lane) => lane.id === this.id()),
    );
    protected readonly title = computed(
        () => LANES[this.index()]?.title ?? this.id(),
    );
    // a note belongs to the lane its middle is over
    protected readonly count = computed(
        () =>
            this.view().layout.filter(
                (item) =>
                    !item.static &&
                    laneOf(item.x + item.w / 2 - 0.5) === this.index(),
            ).length,
    );
}
