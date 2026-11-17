import { Component, computed, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    horizontalCompactor,
    type Layout,
    type LayoutItem,
    verticalCompactor,
} from "@fragiola/grid-layout-angular";
import {
    fastHorizontalCompactor,
    fastVerticalCompactor,
} from "@fragiola/grid-layout-angular/compactors";
import { ClickableButton } from "#/components/atoms/clickable";
import { seeded } from "../_kit/layouts";
import { LastCompaction } from "./last-compaction";
import * as styles from "./styles";
import { createCompactionTimer } from "./timer";

const COUNT = 1000;
const COLS = 48;

/**
 * `count` tiles in bands of two rows, a free row between bands and a few free cells between
 * tiles: no overlap, every gap something for the compactor to close.
 */
function tiles(count: number, seed: number): Layout {
    const random = seeded(seed);
    const items: LayoutItem[] = [];
    let x = 0;
    let band = 0;
    while (items.length < count) {
        const w = 1 + Math.floor(random() * 3);
        x += Math.floor(random() * 3);
        if (x + w > COLS) {
            x = 0;
            band += 1;
            continue;
        }
        const h = 1 + Math.floor(random() * 2);
        items.push({ id: `${items.length + 1}`, x, y: band * 3, w, h });
        x += w;
    }
    return items;
}

const timer = createCompactionTimer();

// Stable compactors (module level): a new object would configure the grid again on each change.
const MODES = [
    { name: "Vertical", compactor: timer.time(verticalCompactor) },
    { name: "Fast vertical", compactor: timer.time(fastVerticalCompactor) },
    { name: "Horizontal", compactor: timer.time(horizontalCompactor) },
    {
        name: "Fast horizontal",
        compactor: timer.time(fastHorizontalCompactor),
    },
];

// A thousand tiles. The standard compactors resolve collisions one by one, which grows fast with
// the number of items; the fast ones (opt-ins, from `/compactors`) settle the same layouts in one
// pass. Pick one: the grid settles again, and every compaction (a switch, a scatter, each step of
// a drag) is timed. Tiles are plain boxes: with this many, what each one renders counts too.
@Component({
    selector: "example-fast-compactors",
    imports: [GRID_LAYOUT, ClickableButton, LastCompaction],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <fieldset aria-label="Compactor" [class]="styles.segments">
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
                <button kitClickable size="sm" variant="outline" (click)="seed.set(seed() + 1)">
                    Scatter
                </button>
                <example-fast-compactors-last-compaction [timer]="timer" />
            </div>
            <!-- a new layout to settle: \`defaultLayout\` is read when a grid starts -->
            @for (run of [seed()]; track "seed-" + run) {
                <div
                    gridLayoutRoot
                    [defaultLayout]="start()"
                    [cols]="cols"
                    [compactor]="current()?.compactor"
                    [rowHeight]="10"
                    [gap]="[2, 2]"
                    [padding]="[4, 4]"
                    [attr.aria-label]="count + ' tiles'"
                    [class]="styles.root"
                >
                    <div
                        *gridLayoutItems="let item"
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="'Tile ' + item.id"
                        [class]="styles.item(part.state())"
                    ></div>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class FastCompactors {
    protected readonly styles = styles;
    protected readonly modes = MODES;
    protected readonly timer = timer;
    protected readonly count = COUNT;
    protected readonly cols = COLS;
    protected readonly mode = signal(1);
    protected readonly seed = signal(11);
    protected readonly start = computed(() => tiles(COUNT, this.seed()));
    protected readonly current = computed(() => MODES[this.mode()] ?? MODES[0]);
}
