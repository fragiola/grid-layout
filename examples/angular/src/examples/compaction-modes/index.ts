import { Component, computed, signal } from "@angular/core";
import {
    type Compactor,
    GRID_LAYOUT,
    horizontalCompactor,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";
import { scattered } from "../_kit/layouts";
import { WIDGETS, widget } from "../_kit/widgets";
import * as styles from "./styles";

const MODES: { name: string; compactor: Compactor }[] = [
    { name: "Vertical", compactor: verticalCompactor },
    { name: "Horizontal", compactor: horizontalCompactor },
    { name: "None", compactor: noCompactor },
];

const ids = WIDGETS.map((entry) => entry.id);

let next = 0;

// How a layout settles after every change. Vertical (the default) lifts items into the gaps
// above; horizontal pulls them toward the start; none leaves them where they are put, pushing
// down only what would overlap. preventCollision refuses a move into an occupied cell instead of
// pushing. The same scattered layout, settled each way.
@Component({
    selector: "example-compaction-modes",
    imports: [GRID_LAYOUT, ClickableButton, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <fieldset aria-label="Compaction" [class]="styles.segments">
                    @for (entry of modes; track entry.name; let index = $index) {
                        <button
                            kitClickable
                            size="sm"
                            [variant]="index === mode() ? 'solid' : 'outline'"
                            [class]="styles.segment(index === mode())"
                            [attr.aria-pressed]="index === mode()"
                            (click)="mode.set(index)"
                        >
                            {{ entry.name }}
                        </button>
                    }
                </fieldset>
                <span [class]="styles.option">
                    <button kitSwitch [attr.aria-labelledby]="label" [(checked)]="preventCollision">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="label">Prevent collisions</span>
                </span>
                <span [class]="styles.option">
                    <button
                        kitClickable
                        size="sm"
                        variant="outline"
                        aria-label="Fewer items"
                        (click)="count.set(Math.max(2, count() - 2))"
                    >
                        −
                    </button>
                    <output aria-label="Items" [class]="styles.count">{{ count() }}</output>
                    <button
                        kitClickable
                        size="sm"
                        variant="outline"
                        aria-label="More items"
                        (click)="count.set(Math.min(24, count() + 2))"
                    >
                        +
                    </button>
                </span>
            </div>
            <!-- a new layout for a new count: \`defaultLayout\` is read when a grid starts -->
            @for (run of [count()]; track "count-" + run) {
                <div
                    gridLayoutRoot
                    [defaultLayout]="layout()"
                    [compactor]="current()?.compactor"
                    [preventCollision]="preventCollision()"
                    [rowHeight]="48"
                    [gap]="[10, 10]"
                    [attr.aria-label]="current()?.name + ' compaction'"
                    [class]="styles.root"
                >
                    <div
                        *gridLayoutItems="let item"
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="item.id"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ title(item.id) }}</span>
                    </div>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class CompactionModes {
    protected readonly styles = styles;
    protected readonly modes = MODES;
    protected readonly Math = Math;
    protected readonly label = `compaction-modes-label-${++next}`;
    protected readonly mode = signal(0);
    protected readonly preventCollision = signal(false);
    protected readonly count = signal(8);
    protected readonly current = computed(() => MODES[this.mode()] ?? MODES[0]);
    protected readonly layout = computed(() =>
        scattered(ids, this.count(), 12),
    );

    protected title(id: string) {
        return widget(id.split("-")[0] ?? id).title;
    }
}
