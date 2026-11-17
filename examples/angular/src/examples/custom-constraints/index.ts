import { Component, computed, signal } from "@angular/core";
import {
    GRID_LAYOUT,
    gridBounds,
    type Layout,
    type LayoutConstraint,
    minMaxSize,
    noCompactor,
    snapToGrid,
    verticalCompactor,
} from "@fragiola/grid-layout-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { SWITCH } from "#/components/ui/switch";
import {
    evenColumns,
    maxArea,
    minHeightFromWidth,
    topHalf,
} from "./constraints";
import * as styles from "./styles";

const MAX_ROWS = 12;

// The app's own rules, each after the defaults (gridBounds, minMaxSize), in stable lists: a new
// list configures the grid again. `rule` is the heart of each one, shown above the grid.
const RULES: {
    name: string;
    constraints: readonly LayoutConstraint[];
    rule: string;
}[] = [
    { name: "None", constraints: [gridBounds, minMaxSize], rule: "" },
    {
        name: "Even columns",
        constraints: [gridBounds, minMaxSize, evenColumns],
        rule: "position: x = Math.round(item.x / 2) * 2",
    },
    {
        name: "Height ≥ width ÷ 2",
        constraints: [gridBounds, minMaxSize, minHeightFromWidth],
        rule: "size: h = Math.max(item.h, Math.ceil(item.w / 2))",
    },
    {
        name: "Area ≤ 12",
        constraints: [gridBounds, minMaxSize, maxArea(12)],
        rule: "size: w × h ≤ 12, the pulled side gives way",
    },
    {
        name: "Top half",
        constraints: [gridBounds, minMaxSize, topHalf],
        rule: "position: y ≤ maxRows ÷ 2 − item.h",
    },
    {
        name: "Snap to 3",
        constraints: [gridBounds, minMaxSize, snapToGrid(3)],
        rule: "snapToGrid(3): x and y round to multiples of 3 (built in)",
    },
];

const layout: Layout = [
    { id: "a", x: 0, y: 0, w: 2, h: 2 },
    { id: "b", x: 2, y: 0, w: 3, h: 2 },
    { id: "c", x: 5, y: 0, w: 2, h: 3 },
    { id: "d", x: 7, y: 0, w: 3, h: 2 },
    { id: "e", x: 10, y: 0, w: 2, h: 2 },
    { id: "f", x: 0, y: 2, w: 4, h: 2 },
    { id: "g", x: 4, y: 3, w: 4, h: 2 },
    { id: "h", x: 8, y: 2, w: 4, h: 2 },
];

let next = 0;

// Constraints written in the app (constraints.ts) next to the built-in snapToGrid: pick one and
// drag or resize, by pointer or keyboard. Compaction runs after the constraints, so a position
// rule on rows shows best without it.
@Component({
    selector: "example-custom-constraints",
    imports: [GRID_LAYOUT, ClickableButton, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <fieldset aria-label="Custom rule" [class]="styles.segments">
                    @for (entry of rules; track entry.name; let index = $index) {
                        <button
                            kitClickable
                            size="sm"
                            [variant]="index === chosen() ? 'solid' : 'outline'"
                            [class]="styles.segment(index === chosen())"
                            [attr.aria-pressed]="index === chosen()"
                            (click)="chosen.set(index)"
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
                @if (current().rule) {
                    <code [class]="styles.rule">{{ current().rule }}</code>
                }
            </p>
            <div
                gridLayoutRoot
                [defaultLayout]="layout"
                [constraints]="current().constraints"
                [compactor]="compact() ? verticalCompactor : noCompactor"
                [maxRows]="maxRows"
                [rowHeight]="32"
                [gap]="[10, 10]"
                [attr.aria-label]="current().name + ' rule'"
                [class]="styles.root"
            >
                <ng-template gridLayoutItems let-item>
                    @let name = item.id.toUpperCase();
                    <div
                        [gridLayoutItem]="item.id"
                        #part="gridLayoutItem"
                        [attr.aria-label]="'Item ' + name"
                        [class]="styles.item(part.state())"
                    >
                        <span [class]="styles.title">{{ name }}</span>
                        <span [class]="styles.value">{{ item.w }} × {{ item.h }}</span>
                        <span [class]="styles.place">x {{ item.x }}, y {{ item.y }}</span>
                        <div
                            *gridLayoutResizeHandle="'bottom-end'"
                            [attr.aria-label]="'Resize item ' + name"
                            [class]="styles.resizeHandle"
                        ></div>
                    </div>
                </ng-template>
                <div *gridLayoutPlaceholder [class]="styles.placeholder"></div>
            </div>
        </div>
    `,
})
export default class CustomConstraints {
    protected readonly styles = styles;
    protected readonly rules = RULES;
    protected readonly layout = layout;
    protected readonly maxRows = MAX_ROWS;
    protected readonly verticalCompactor = verticalCompactor;
    protected readonly noCompactor = noCompactor;
    protected readonly label = `custom-constraints-label-${++next}`;
    protected readonly chosen = signal(0);
    protected readonly compact = signal(true);
    protected readonly current = computed(
        () => RULES[this.chosen()] ?? (RULES[0] as (typeof RULES)[number]),
    );
    protected readonly names = computed(() =>
        this.current()
            .constraints.map((constraint) => constraint.name)
            .join(", "),
    );
}
