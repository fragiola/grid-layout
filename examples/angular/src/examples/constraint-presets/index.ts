import { Component, computed, signal } from "@angular/core";
import {
    boundedX,
    boundedY,
    containerBounds,
    defaultConstraints,
    GRID_LAYOUT,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    verticalCompactor,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";
import * as styles from "./styles";

const MAX_ROWS = 8;

// Each preset is a stable list (module level): a new list configures the grid again.
const PRESETS: {
    name: string;
    constraints: readonly LayoutConstraint[];
    says: string;
}[] = [
    {
        name: "Default",
        constraints: defaultConstraints,
        says: "Items stay inside the columns and the first 8 rows; B and D keep their own limits.",
    },
    {
        name: "Bounded X",
        constraints: [boundedX, minMaxSize],
        says: "Only the columns bound a move: without compaction, an item goes below row 8.",
    },
    {
        name: "Bounded Y",
        constraints: [boundedY, minMaxSize],
        says: "A move stops at row 8 (the columns are always a hard rule); a resize may grow past it.",
    },
    {
        name: "Container",
        constraints: [containerBounds, minMaxSize],
        says: "Items stay inside the rows the grid shows: its own height, not maxRows.",
    },
    {
        name: "Grid bounds only",
        constraints: [gridBounds],
        says: "No minMaxSize: B and D resize past their own limits.",
    },
    {
        name: "None",
        constraints: [],
        says: "No rule but the columns: items go below row 8 and ignore their limits.",
    },
];

const CONTAINER = 3;

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 2, h: 3, minH: 2, maxH: 4 },
    { id: "e", x: 9, y: 0, w: 3, h: 2 },
    { id: "f", x: 0, y: 2, w: 5, h: 2 },
];

const limits = (item: Layout[number]) =>
    item.minW !== undefined
        ? `width ${item.minW}–${item.maxW}`
        : item.minH !== undefined
          ? `height ${item.minH}–${item.maxH}`
          : undefined;

let next = 0;

// The grid's constraints decide where every place and size may go, by pointer, keyboard or
// command. The defaults are gridBounds (the columns and maxRows) then minMaxSize (each item's own
// limits); a preset replaces the list. Compaction runs after the constraints: with vertical
// compaction an item put low still rises, so turn it off to see a position rule alone.
@Component({
    selector: "example-constraint-presets",
    imports: [GRID_LAYOUT, ClickableButton, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <fieldset aria-label="Constraints" [class]="styles.segments">
                    @for (entry of presets; track entry.name; let index = $index) {
                        <button
                            kitClickable
                            size="sm"
                            [variant]="index === preset() ? 'solid' : 'outline'"
                            [class]="styles.segment(index === preset())"
                            [attr.aria-pressed]="index === preset()"
                            (click)="preset.set(index)"
                        >
                            {{ entry.name }}
                        </button>
                    }
                </fieldset>
                <span [class]="styles.option">
                    <button kitSwitch [(checked)]="compact" [attr.aria-labelledby]="label">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="label">Vertical compaction</span>
                </span>
            </div>
            <p [class]="styles.note">
                <code [class]="styles.code">[{{ names() }}]</code>
                {{ current().says }}
            </p>
            <!-- each preset starts from the same layout: one may have left items where another
                 forbids them (a remount per preset) -->
            @for (run of [preset()]; track 'preset-' + run) {
                <!-- containerBounds reads the root's own height: a fixed one, not the layout's -->
                <div
                    gridLayoutRoot
                    [defaultLayout]="layout"
                    [constraints]="current().constraints"
                    [compactor]="compact() ? verticalCompactor : noCompactor"
                    [maxRows]="maxRows"
                    [autoSize]="!container()"
                    [rowHeight]="40"
                    [gap]="[10, 10]"
                    [attr.aria-label]="current().name + ' constraints'"
                    [class]="styles.root(container())"
                >
                    <!-- where maxRows ends, drawn under the items: a picture of the rule, no part -->
                    @if (!container()) {
                        <div aria-hidden="true" [class]="styles.maxRows">
                            maxRows {{ maxRows }}
                        </div>
                    }
                    <ng-template gridLayoutItems let-item>
                        @let name = item.id.toUpperCase();
                        @let limit = limits(item);
                        <div
                            [gridLayoutItem]="item.id"
                            #part="gridLayoutItem"
                            [attr.aria-label]="'Item ' + name"
                            [class]="styles.item(part.state())"
                        >
                            <span [class]="styles.title">{{ name }}</span>
                            <span [class]="styles.value">{{ item.w }} × {{ item.h }}</span>
                            <span [class]="styles.place">x {{ item.x }}, y {{ item.y }}</span>
                            @if (limit) {
                                <span [class]="styles.place">{{ limit }}</span>
                            }
                            <div
                                *gridLayoutResizeHandle="'bottom-end'"
                                [attr.aria-label]="'Resize item ' + name"
                                [class]="styles.resizeHandle"
                            ></div>
                        </div>
                    </ng-template>
                    <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
                </div>
            }
        </div>
    `,
})
export default class ConstraintPresets {
    protected readonly styles = styles;
    protected readonly presets = PRESETS;
    protected readonly layout = layout;
    protected readonly limits = limits;
    protected readonly maxRows = MAX_ROWS;
    protected readonly verticalCompactor = verticalCompactor;
    protected readonly noCompactor = noCompactor;
    protected readonly label = `constraint-presets-label-${++next}`;
    protected readonly preset = signal(0);
    protected readonly compact = signal(false);
    protected readonly current = computed(
        () =>
            PRESETS[this.preset()] ?? (PRESETS[0] as (typeof PRESETS)[number]),
    );
    protected readonly names = computed(() =>
        this.current()
            .constraints.map((rule) => rule.name)
            .join(", "),
    );
    protected readonly container = computed(() => this.preset() === CONTAINER);
}
