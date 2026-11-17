import { Component, signal } from "@angular/core";
import {
    createGridLayoutRef,
    GRID_LAYOUT,
    injectBreakpoint,
    type Layout,
} from "@fragiola/grid-layout-angular";
import { widget } from "../_kit/widgets";
import * as styles from "./styles";

const BREAKPOINTS = { wide: 440, narrow: 0 };
const COLS = { wide: 6, narrow: 2 };

const LAYOUT: Layout = [
    { id: "revenue", x: 0, y: 0, w: 2, h: 2 },
    { id: "orders", x: 2, y: 0, w: 2, h: 2 },
    { id: "visitors", x: 4, y: 0, w: 2, h: 2 },
    { id: "uptime", x: 0, y: 2, w: 6, h: 2 },
];

let next = 0;

/** One grid of the page: its ref, and its breakpoint read from outside its root. */
function board(label: string) {
    const gridLayoutRef = createGridLayoutRef();
    return { label, gridLayoutRef, current: injectBreakpoint(gridLayoutRef) };
}

// The breakpoint is the grid's own width's (R1): one page, two grids, two breakpoints at once.
// The panel's width is yours to change; the sidebar stays narrow. A viewport media query would
// give both the same.
@Component({
    selector: "example-container-breakpoints",
    imports: [GRID_LAYOUT],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <label [for]="slider" [class]="styles.control">
                Panel width
                <input
                    [id]="slider"
                    type="range"
                    min="260"
                    max="760"
                    step="20"
                    [value]="width()"
                    (input)="onWidth($event)"
                    [class]="styles.slider"
                />
                <span [class]="styles.number">{{ width() }}px</span>
            </label>
            <div [class]="styles.page">
                <!-- one grid in a box of its width, saying its breakpoint -->
                @for (board of boards; track board.label) {
                    @let current = board.current();
                    <section
                        [attr.aria-label]="board.label"
                        [class]="styles.board"
                        [style.width.px]="board.label === 'Panel' ? width() : 200"
                    >
                        <p
                            [class]="styles.badge"
                            [attr.data-testid]="'breakpoint-' + board.label.toLowerCase()"
                        >
                            {{ board.label }}: {{ current ? current.breakpoint + ', ' + current.cols + ' columns' : '…' }}
                        </p>
                        <div
                            gridLayoutRoot
                            [gridLayoutRef]="board.gridLayoutRef"
                            [breakpoints]="breakpoints"
                            [cols]="cols"
                            [defaultLayouts]="layouts"
                            [rowHeight]="44"
                            [gap]="[10, 10]"
                            [attr.aria-label]="board.label + ' dashboard'"
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
                    </section>
                }
            </div>
        </div>
    `,
})
export default class ContainerBreakpoints {
    protected readonly styles = styles;
    protected readonly widget = widget;
    protected readonly breakpoints = BREAKPOINTS;
    protected readonly cols = COLS;
    protected readonly layouts = { wide: LAYOUT };
    protected readonly slider = `container-breakpoints-slider-${++next}`;
    protected readonly width = signal(500);
    /** each grid has its own ref: the badges read them from outside the roots */
    protected readonly boards = [board("Panel"), board("Sidebar")];

    protected onWidth(event: Event) {
        this.width.set(Number((event.target as HTMLInputElement).value));
    }
}
